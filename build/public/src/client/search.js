"use strict";define("forum/search",["search","autocomplete","storage"],function(e,s,t){var a={};a.init=function(){var s=$("#results").attr("data-search-query");$("#search-input").val(s);var t=$("#search-in");t.on("change",function(){i(t.val())});c(s);$("#advanced-search").off("submit").on("submit",function(s){s.preventDefault();e.query(r(),function(){$("#search-input").val("")});return false});o();l();n()};function r(){var e=$("#advanced-search");var s={in:$("#search-in").val()};s.term=$("#search-input").val();if(s.in==="posts"||s.in==="titlesposts"||s.in==="titles"){s.by=e.find("#posted-by-user").val();s.categories=e.find("#posted-in-categories").val();s.searchChildren=e.find("#search-children").is(":checked");s.hasTags=e.find("#has-tags").tagsinput("items");s.replies=e.find("#reply-count").val();s.repliesFilter=e.find("#reply-count-filter").val();s.timeFilter=e.find("#post-time-filter").val();s.timeRange=e.find("#post-time-range").val();s.sortBy=e.find("#post-sort-by").val();s.sortDirection=e.find("#post-sort-direction").val();s.showAs=e.find("#show-as-topics").is(":checked")?"topics":"posts"}return s}function i(e){var s=e.indexOf("posts")===-1&&e.indexOf("titles")===-1;$(".post-search-item").toggleClass("hide",s)}function n(){var s=utils.params();var t=e.getSearchPreferences();var a=utils.merge(t,s);if(a){if(s.term){$("#search-input").val(s.term)}if(a.in){$("#search-in").val(a.in);i(a.in)}if(a.by){$("#posted-by-user").val(a.by)}if(a.categories){$("#posted-in-categories").val(a.categories)}if(a.searchChildren){$("#search-children").prop("checked",true)}if(a.hasTags){a.hasTags=Array.isArray(a.hasTags)?a.hasTags:[a.hasTags];a.hasTags.forEach(function(e){$("#has-tags").tagsinput("add",e)})}if(a.replies){$("#reply-count").val(a.replies);$("#reply-count-filter").val(a.repliesFilter)}if(a.timeRange){$("#post-time-range").val(a.timeRange);$("#post-time-filter").val(a.timeFilter)}if(a.sortBy||ajaxify.data.searchDefaultSortBy){$("#post-sort-by").val(a.sortBy||ajaxify.data.searchDefaultSortBy);$("#post-sort-direction").val(a.sortDirection)}if(a.showAs){var r=a.showAs==="topics";var n=a.showAs==="posts";$("#show-as-topics").prop("checked",r).parent().toggleClass("active",r);$("#show-as-posts").prop("checked",n).parent().toggleClass("active",n)}}}function c(e){if(!e){return}var s=e.replace(/^"/,"").replace(/"$/,"").trim().split(" ").join("|");var t=new RegExp("("+s+")","gi");$(".search-result-text p, .search-result-text h4").each(function(){var e=$(this);var s=[];e.find("*").each(function(){$(this).after("\x3c!-- "+s.length+" --\x3e");s.push($("<div />").append($(this)))});e.html(e.html().replace(t,"<strong>$1</strong>"));for(var a=0,r=s.length;a<r;a+=1){e.html(e.html().replace("\x3c!-- "+a+" --\x3e",s[a].html()))}});$(".search-result-text").find("img:not(.not-responsive)").addClass("img-responsive")}function o(){$("#save-preferences").on("click",function(){t.setItem("search-preferences",JSON.stringify(r()));app.alertSuccess("[[search:search-preferences-saved]]");return false});$("#clear-preferences").on("click",function(){t.removeItem("search-preferences");var e=$("#search-input").val();$("#advanced-search")[0].reset();$("#search-input").val(e);app.alertSuccess("[[search:search-preferences-cleared]]");return false})}function l(){s.user($("#posted-by-user"));var e=$("#has-tags");e.tagsinput({confirmKeys:[13,44],trimValue:true});s.tag($("#has-tags").siblings(".bootstrap-tagsinput").find("input"))}return a});
//# sourceMappingURL=public/src/client/search.js.map