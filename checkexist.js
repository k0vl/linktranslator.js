function checkexist(rawlist, LangCode, callback) {

    //rawlist: array of names
    //lang code: the language code of the target wiki
    //callback(listOfExistance, missing, invalid);

    if (rawlist.constructor !== Array) {
    	console.error("not an array!");
        return;
    }

    //alert("rawlist:" + rawlist);

    if (rawlist.length === 0) {
    	console.error("rawlist.length === 0");
        return;
    }

    var api = 'https://' + LangCode + '.wikipedia.org/w/api.php';
	
    //data
    var missing = [];
    var invalid = [];
    var listOfExistance = [];
    
    //control
    var i, j, temparray;
    var deferreds = [];

    //seperate them into parts of 50, as the max for a single request is 50 (500 for bots)
    for (i = 0, j = rawlist.length; i < j; i += 50) {
        temparray = rawlist.slice(i, i + 50).join('|');
        deferreds.push(loadArrays(temparray));
    }

    //when all async operation finished, call complete. 
    $.when.apply($, deferreds).then(function () {
        complete();
    });

	//here we make the ajax request, and return the handle so that it can be loaded to deferreds[]
    function loadArrays(titles) {
        return $.ajax({
            data: {
                action: 'query',
                format: 'json',
                titles: titles,
                prop: 'langlinks',
                redirects: 1
            },
            dataType: "jsonp",
            type: 'POST',
            url: api,
            success: function (data) {
                //alert("data:" + JSON.stringify(data));
                if (data.query) {
                    //request successful

                    var pages = data.query.pages;
                    var pageListLen = pages.length;

                    for (var pageIndex in pages) {
                        if (pages[pageIndex].hasOwnProperty("missing")) {
                            missing.push(pages[pageIndex].title);
                        } else if (pages[pageIndex].hasOwnProperty("invalid")) {
                            invalid.push(pages[pageIndex].title);
                        } else {
                            listOfExistance.push(pages[pageIndex].title);
                        }
                    }
                } else if (data.error) {
                    //error, obviously.
                    alert(data.error.code + ":" + data.error.info);
                    return;
                } else {
                    //what happend? empty list?
                    alert('Huh?!');
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                alert(textStatus);
            },

        }); //ajax complete
    }

    function complete() {
        // alert("listOfExistance:\n" + listOfExistance);
        // alert("missing:\n" + missing);
        // alert("invalid:\n" + invalid);

        callback(listOfExistance, missing, invalid);
    }
}

//test module
// (function(){
// var testCheckList = [];
// testCheckList = ['Ben','eeded','Fuck','链入页面','...','Oblivion:',':desrever',':en:tanswiki',':en:Barack Obama','#hashtag','{{tl}}','101'];
// testCheckList = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25',
// '26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50',
// '51','52','53','54','55','56','57','58','59','60','61','62','63','64','65','66','67','68','69','70','71','72','73','74','75',
// '76','77','78','79','80','81','82','83','84','85','86','87','88','89','90','91','92','93','94','95','96','97','98','99','100','101'];
// checkexist(testCheckList,'en',function(exist, missing, invalid){
// 	exist.sort();
// 	missing.sort();
// 	invalid.sort();
// 	alert('exist:' + exist + '\nmissing:' + missing + '\ninvalid:' + invalid);
// });
// })();
