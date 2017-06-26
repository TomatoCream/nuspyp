"use strict";define("notifications",["sounds","translator","components"],function(t,a,n){var i={};var e={};i.prepareDOM=function(){var a=n.get("notifications");var o=a.children("a");var r=n.get("notifications/list");var s=n.get("notifications/icon");o.on("click",function(t){t.preventDefault();if(a.hasClass("open")){return}i.loadNotifications(r)});r.on("click","[data-nid]",function(){var t=$(this).hasClass("unread");var a=$(this).attr("data-nid");if(!t){return}socket.emit("notifications.markRead",a,function(t){if(t){return app.alertError(t.message)}c(-1);if(e[a]){delete e[a]}})});a.on("click",".mark-all-read",i.markAllRead);r.on("click",".mark-read",function(){var t=$(this).parent();var a=t.hasClass("unread");var n=t.attr("data-nid");socket.emit("notifications.mark"+(a?"Read":"Unread"),n,function(i){if(i){return app.alertError(i.message)}t.toggleClass("unread");c(a?-1:1);if(a&&e[n]){delete e[n]}});return false});function c(t){var a=parseInt(s.attr("data-content"),10)+t;i.updateNotifCount(a)}socket.on("event:new_notification",function(a){var n={alert_id:"new_notif",title:"[[notifications:new_notification]]",timeout:2e3};if(a.path){n.message=a.bodyShort;n.type="info";n.clickfn=function(){if(a.path.startsWith("http")&&a.path.startsWith("https")){window.location.href=a.path}else{window.location.href=window.location.protocol+"//"+window.location.host+config.relative_path+a.path}}}else{n.message="[[notifications:you_have_unread_notifications]]";n.type="warning"}app.alert(n);app.refreshTitle();if(ajaxify.currentPage==="notifications"){ajaxify.refresh()}socket.emit("notifications.getCount",function(t,a){if(t){return app.alertError(t.message)}i.updateNotifCount(a)});if(!e[a.nid]){t.play("notification",a.nid);e[a.nid]=true}});socket.on("event:notifications.updateCount",function(t){i.updateNotifCount(t)})};i.loadNotifications=function(t){socket.emit("notifications.get",null,function(n,i){if(n){return app.alertError(n.message)}var e=i.unread.concat(i.read).sort(function(t,a){return parseInt(t.datetime,10)>parseInt(a.datetime,10)?-1:1});a.toggleTimeagoShorthand();for(var o=0;o<e.length;o+=1){e[o].timeago=$.timeago(new Date(parseInt(e[o].datetime,10)))}a.toggleTimeagoShorthand();templates.parse("partials/notifications_list",{notifications:e},function(a){t.translateHtml(a)})})};i.updateNotifCount=function(t){var a=n.get("notifications/icon");t=Math.max(0,t);if(t>0){a.removeClass("fa-bell-o").addClass("fa-bell")}else{a.removeClass("fa-bell").addClass("fa-bell-o")}a.toggleClass("unread-count",t>0);a.attr("data-content",t>99?"99+":t);var i={count:t,updateFavicon:true};$(window).trigger("action:notification.updateCount",i);if(i.updateFavicon){Tinycon.setBubble(t>99?"99+":t)}};i.markAllRead=function(){socket.emit("notifications.markAllRead",function(t){if(t){app.alertError(t.message)}i.updateNotifCount(0);e={}})};return i});
//# sourceMappingURL=public/src/modules/notifications.js.map