"use strict";define("composer/resize",[],function(){var e={};var t=0;var o=.3;var i=.05;var n=992;var r=$("body");var a=$(window);var m=$('[component="navbar"]');var u=document.documentElement;var s=document.body;var v=m[0];function d(){return localStorage.getItem("composer:resizeRatio")||.5}function c(e){localStorage.setItem("composer:resizeRatio",Math.min(e,1))}function f(){var e=v.getBoundingClientRect();var t={top:0,left:0,right:window.innerWidth,bottom:window.innerHeight};t.width=t.right;t.height=t.bottom;t.boundedTop=e.bottom;t.boundedHeight=t.bottom-e.bottom;return t}function l(e,t){var i=f();var r=e[0];if(i.width>=n){t=Math.min(Math.max(t,o),1);var a=t*i.boundedHeight/i.height;r.style.top=((1-a)*100).toString()+"%";var m=r.getBoundingClientRect();s.style.paddingBottom=(m.bottom-m.top).toString()+"px"}else{e.removeAttr("style");s.style.paddingBottom=0}e.ratio=t;r.style.visibility="visible"}var h=l;var g=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame;if(g){h=function(e,t){g(function(){l(e,t);setTimeout(function(){a.trigger("action:composer.resize")},0)})}}e.reposition=function(e){var t=d();if(t>=1-i){t=1;e.addClass("maximized")}h(e,t)};e.maximize=function(t,o){if(o){h(t,1)}else{e.reposition(t)}};e.handleResize=function(e){var o=0;var n=0;var m=0;var u=e.find(".resizer");var s=u[0];function v(e){var t=s.getBoundingClientRect();var i=(t.top+t.bottom)/2;o=(i-e.clientY)/2;n=e.clientY;a.on("mousemove",d);a.on("mouseup",l);r.on("touchmove",g)}function d(t){var i=t.clientY-o;var n=f();var r=(n.height-i)/n.boundedHeight;h(e,r)}function l(u){u.preventDefault();m=u.clientY;e.find("textarea").focus();a.off("mousemove",d);a.off("mouseup",l);r.off("touchmove",g);var s=m-o;var v=f();var p=(v.height-s)/v.boundedHeight;if(m-n===0&&e.hasClass("maximized")){e.removeClass("maximized");p=!t||t>=1-i?.5:t;h(e,p)}else if(m-n===0||p>=1-i){h(e,1);e.addClass("maximized");t=p}else{e.removeClass("maximized")}c(p)}function g(e){e.preventDefault();d(e.touches[0])}u.on("mousedown",function(e){e.preventDefault();v(e)}).on("touchstart",function(e){e.preventDefault();v(e.touches[0])}).on("touchend",l)};return e});
//# sourceMappingURL=node_modules/nodebb-plugin-composer-default/static/lib/composer/resize.js.map