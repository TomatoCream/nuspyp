"use strict";define("forum/groups/memberlist",["components","forum/infinitescroll"],function(){var r={};var e;var t;var n;r.init=function(r){n=r||"groups/details";t=ajaxify.data.group.name;o();a()};function o(){$('[component="groups/members/search"]').on("keyup",function(){var r=$(this).val();if(e){clearInterval(e);e=0}e=setTimeout(function(){socket.emit("groups.searchMembers",{groupName:t,query:r},function(r,e){if(r){return app.alertError(r.message)}u(e.users,function(r){$('[component="groups/members"] tbody').html(r);$('[component="groups/members"]').attr("data-nextstart",20)})})},250)})}function a(){$('[component="groups/members"] tbody').on("scroll",function(){var r=$(this);var e=(r[0].scrollHeight-r.innerHeight())*.9;if(r.scrollTop()>e){s()}})}function s(){var r=$('[component="groups/members"]');if(r.attr("loading")){return}r.attr("loading",1);socket.emit("groups.loadMoreMembers",{groupName:t,after:r.attr("data-nextstart")},function(e,t){if(e){return app.alertError(e.message)}if(t&&t.users.length){i(t.users,function(){r.removeAttr("loading");r.attr("data-nextstart",t.nextStart)})}else{r.removeAttr("loading")}})}function i(r,e){r=r.filter(function(r){return!$('[component="groups/members"] [data-uid="'+r.uid+'"]').length});u(r,function(r){$('[component="groups/members"] tbody').append(r);e()})}function u(r,e){app.parseAndTranslate(n,"members",{group:{members:r,isOwner:ajaxify.data.group.isOwner}},e)}return r});
//# sourceMappingURL=public/src/client/groups/memberlist.js.map