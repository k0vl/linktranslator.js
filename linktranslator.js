//Link Translator
//由[[User:Liangent]]最初设计
//由[[User:Kovl]]修改
//源代码取自[[User:Liangent/Gadgets/Toolkit/linktranslator.uncompressed.js]]
//v2015-2-6-7-52
//此脚本不依赖其他脚本

$(function() {
importScriptURI('https://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.js'); 

var LTUI = {
    Translate:"翻译",
    TranslateLinks:"翻译链接",
    LinkTranslator:"链接翻译器",
    TLTitle:"自动翻译从其他语言维基百科复制的文本",
    SourceLanguageCode:"目标维基的语言代码：",
    OriginalLink:"原链接：",
    NOLINKINPAGE:"此页没有链接",
    Done:"完成",
    NoWikiEd:"linktranslator.js与WikiEd不兼容，请于页面右上角暂时禁用WikiEd。",
    EditMessage:"由[[User:Kovl/selfportal/代码库/linktranslator.js|链接翻译器]]自动翻译；",
    
    //OPTION
    KeepOriginalText:"显示原文：",
    CommentOriginalLink:"注释原链接：",
    UseLangLink:"跨语言链接：",
    
    //STATUS
    PARSEFAILED:"解析失败",
    ERROR:"错误",
    NOLINK:"没有链接",
    MULTIPLELINK:"多个连接",
    PAGESAME:"页面相同",
    PAGEDIFF:"页面不同",
    DONTEXIST:"页面不存在"
};

var LTConf = {
    SourceLanguageCode:"en",
    KeepOriginalText:"", //"checked" OR ""
    CommentOriginalLink:"",
    UseLangLink:"checked"
};

//clear previous button
$('#wpLinktranslator').remove();

// secure server?
if ((wgAction == 'edit' || wgAction == 'submit') && wgServer == '//zh.wikipedia.org') {
    $('#wpDiff').after('\n<input id="wpLinktranslator" value="' + LTUI.TranslateLinks + '" title="' + LTUI.TLTitle + '" type="button"/>');
    $('#wpLinktranslator').click(LTClick);
}

//variables
var jobid = 0;
var ldsb = '__LEFT_DOUBLE_SQUARE_BRACKETS__';
var EXEConf;

//on click "Translate links" #wpLinktranslator
function LTClick(event) {
    event.preventDefault();
    $('#linktranslator').remove();
    if ($("#wikEdFrameWrapper").css("visibility") == "visible"){
	    alert(LTUI.NoWikiEd);
	    return;
	}
    $('<div id="linktranslator" title="' + LTUI.LinkTranslator + '">' +
        '<label for="linktranslator-source-lang">' + LTUI.SourceLanguageCode + '</label> ' +
        '<input id="linktranslator-source-lang" value="' + LTConf.SourceLanguageCode + '" type="text" /><br />' +
        '<label for="linktranslator-keep-original">' + LTUI.KeepOriginalText + '</label> ' +
        '<input type="checkbox" id="linktranslator-keep-original" ' + LTConf.KeepOriginalText + '/><br />' +
        '<label for="linktranslator-comment-link">' + LTUI.CommentOriginalLink + '</label> ' +
        '<input type="checkbox" id="linktranslator-comment-link" ' + LTConf.CommentOriginalLink + '/><br />' +
        '<label for="linktranslator-lang-link">' + LTUI.UseLangLink + '</label> ' +
        '<input type="checkbox" id="linktranslator-lang-link" ' + LTConf.UseLangLink + '/><br />' +
        '<input id="linktranslator-translate" value="' + LTUI.Translate + '" type="button" /></div>'
        
    ).dialog({
        modal: false,
        close: function() {jobid++;},
        width: 500
    });
    $('#linktranslator-translate').click(TClick);
}

//on click "Translate" #linktranslator-translate
function TClick(event) {
    event.preventDefault();
    var thisjobid = jobid; // or in #wpLinktranslator's click event?
    
    EXEConf = {
		KeepOriginalText:$('#linktranslator-keep-original').prop('checked'),
		CommentOriginalLink:$('#linktranslator-comment-link').prop('checked'),
		UseLangLink:$('#linktranslator-lang-link').prop('checked')
	};
	
    LTConf.SourceLanguageCode = $('#linktranslator-source-lang').val();
    var api = 'http://' + LTConf.SourceLanguageCode + '.wikipedia.org/w/api.php';
    if (document.location.protocol == 'https:') {
        api = 'https://' + LTConf.SourceLanguageCode + '.wikipedia.org/w/api.php';
    }
    
    var wikitext = $('#wpTextbox1').val();
    // how to make a set to avoid duplicated links?
    var links = $('#wpTextbox1').val().match(/\[\[.+?\]\]/g);
    
    if (links === null) {
        $('#linktranslator').text(LTUI.NOLINKINPAGE);
        return;
    } else { // assert links.length != 0 here.
        $('#linktranslator').dialog( "option", "position", { my: "top", at: "top"} );
        $('#linktranslator').html('<div id="linktranslator-progressbar"></div>');
        $('#linktranslator-progressbar').progressbar();
    }
    
    var respcount = 0;
    // TODO: should be rewritten using jQuery.each
    
    function eachlink(i) {
        var linkidx = i;
        var link = links[i].slice(2, -2);
        
        var linktarget = link;
        // TODO: pipe tricks like [[/subpage/]]?
        var linkdisplay = link;
        var idx = link.indexOf('|');
        if (idx != -1) {
            linktarget = link.substring(0, idx);
            linkdisplay = link.substring(idx + 1);
        }
        $('#linktranslator').append('<div id="linktranslator-item-' + i + '"></div>');
        $('#linktranslator-item-' + i).text(links[i] + ' -> ')
            .append('<span class="linktranslator-item-newlink">...</span>');
        // TODO: if newtarget == linkdisplay?
        // TODO: cannot identify if missing or [[zh:]] (for main page, also blank text)
        $.ajax({
            data: {
                action: 'parse',
                format: 'json',
                page: linktarget,
                prop: 'langlinks',
                redirects: 1
            },
            dataType: "jsonp",
            type: 'POST',
            url: api,
            success: function(data) {
                console.log(data);
                if (thisjobid != jobid) {
                    return;
                }
                
                var llink;
                var newtarget;
                var newlinks;
                
                if(data.parse){
                	//request successful
                    llink = $.grep(data.parse.langlinks, function(e){ return e.lang === 'zh'; });
                } else if(data.error.info){
                	//request completed with error
                    if(data.error.info == "The page you specified doesn't exist")
                        {$('#linktranslator-item-' + linkidx + ' .linktranslator-item-newlink').text(LTUI.DONTEXIST);}
                    else
                        {$('#linktranslator-item-' + linkidx + ' .linktranslator-item-newlink').text(LTUI.ERROR + '(' + data.error.info + ')');}
                    return;
                } else{
                	//error without info field
                    $('#linktranslator-item-' + linkidx + ' .linktranslator-item-newlink').text(LTUI.PARSEFAILED);
                    return;
                }
                
                if (llink.length === 1) {
                    newtarget = llink[0]["*"];
                    
                    if(linktarget === newtarget){
                        $('#linktranslator-item-' + linkidx + ' .linktranslator-item-newlink').text(LTUI.PAGESAME);
                        return;
                    }
                    
                    //EXEConf.KeepOriginalText
                    if(EXEConf.KeepOriginalText) {
                        newlinks = ldsb + newtarget + '|' + linkdisplay + ']]';
                    } else {
                        newlinks = ldsb + newtarget + ']]';
                    }
                } else if (llink.length === 0) {
                    if(EXEConf.UseLangLink) {
                        newlinks = '{{link-' + LTConf.SourceLanguageCode + '||' + '';
                        if(EXEConf.KeepOriginalText) {
                            newlinks = '{{tsl|' + LTConf.SourceLanguageCode + '|' + linktarget + '||' + linkdisplay +'}}'; 
                        } else {
                            newlinks = '{{tsl|' + LTConf.SourceLanguageCode + '|' + linktarget + '}}'; 
                        }
                    } else {
                        $('#linktranslator-item-' + linkidx + ' .linktranslator-item-newlink').text(LTUI.NOLINK);
                        return;
                    }
                } else {
                   $('#linktranslator-item-' + linkidx + ' .linktranslator-item-newlink').text(LTUI.MULTIPLELINK);
                   return;
                }
                
            
                //EXEConf.CommentOriginalLink
                var newcomment;
                if(EXEConf.CommentOriginalLink) {
                    newcomment = '<!-- ' + LTUI.OriginalLink + ldsb + link + ']] -->';
                } else {
                    newcomment = '';
                }
                
                //mark on dialogue
                $('#linktranslator-item-' + linkidx + ' .linktranslator-item-newlink').text(newlinks.replace(new RegExp(ldsb, 'g'), '[['));
                // only replacing the first is ok, we will run this many times
                wikitext = wikitext.replace(links[linkidx], newlinks + newcomment);
                
            },
            error: function(jqXHR, textStatus, errorThrown) {
                if (thisjobid != jobid) {
                    return;
                }
                $('#linktranslator-item-' + linkidx + ' .linktranslator-item-newlink').text(LTUI.ERROR + '(' + textStatus + ')');
            },
            complete: function() {
                if (thisjobid != jobid) {
                    return;
                }
                respcount++;
                $('#linktranslator-progressbar').progressbar('value', respcount * 100 / links.length);
                if (respcount >= links.length) {
                    $('#wpTextbox1').val(wikitext.replace(new RegExp(ldsb, 'g'), '[['));
                    $('#linktranslator').prepend('<div id="linktranlator-done"><strong>' + LTUI.Done + '</strong></div>');
                }
            }
        });//ajax complete
    }//trino complete
    
    for (var i = 0; i < links.length; i++) {eachlink(i);}
    $('#wpSummary').val(LTUI.EditMessage + $('#wpSummary').val());
}

//end
});
