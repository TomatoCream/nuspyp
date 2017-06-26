"use strict";define("admin/modules/instance",function(){var e={};e.reload=function(e){app.alert({alert_id:"instance_reload",type:"info",title:'Reloading... <i class="fa fa-spin fa-refresh"></i>',message:"NodeBB is reloading.",timeout:5e3});$(window).one("action:reconnected",function(){app.alert({alert_id:"instance_reload",type:"success",title:'<i class="fa fa-check"></i> Success',message:"NodeBB has reloaded successfully.",timeout:5e3});if(typeof e==="function"){e()}});socket.emit("admin.reload")};e.restart=function(e){app.alert({alert_id:"instance_restart",type:"info",title:'Rebuilding... <i class="fa fa-spin fa-refresh"></i>',message:"NodeBB is rebuilding front-end assets (css, javascript, etc).",timeout:1e4});$(window).one("action:reconnected",function(){app.alert({alert_id:"instance_restart",type:"success",title:'<i class="fa fa-check"></i> Success',message:"NodeBB has successfully restarted.",timeout:1e4});if(typeof e==="function"){e()}});socket.emit("admin.restart",function(){app.alert({alert_id:"instance_restart",type:"info",title:'Build Complete!... <i class="fa fa-spin fa-refresh"></i>',message:"NodeBB is reloading.",timeout:1e4})})};return e});
//# sourceMappingURL=public/src/admin/modules/instance.js.map