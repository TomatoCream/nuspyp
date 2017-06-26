"use strict";(function(e){function t(e,t){return Promise.resolve(jQuery.getJSON(config.relative_path+"/assets/language/"+e+"/"+t+".json?"+config["cache-buster"]))}var n=function(){};if(typeof config==="object"&&config.environment==="development"){n=console.warn.bind(console)}if(typeof define==="function"&&define.amd){define("translator",["string"],function(r){return e(r,t,n)})}else if(typeof module==="object"&&module.exports){(function(){var t=require("../../../src/languages");if(global.env==="development"){var r=require("winston");n=function(e){r.warn(e)}}function a(e,n){return new Promise(function(r,a){t.get(e,n,function(e,t){if(e){a(e)}else{r(t)}})})}module.exports=e(require("string"),a,n)})()}else{window.translator=e(window.string,t,n)}})(function(e,t,n){var r=Object.assign||jQuery.extend;function a(e,t){if(!(e instanceof t)){throw new TypeError("Cannot call a class as a function")}}var i=function(){function r(e){var t=this;a(t,r);if(!e){throw new TypeError("Parameter `language` must be a language string. Received "+e+(e===""?"(empty string)":""))}t.modules=Object.keys(r.moduleFactories).map(function(t){var n=r.moduleFactories[t];return[t,n(e)]}).reduce(function(e,t){var n=t[0];var r=t[1];e[n]=r;return e},{});t.lang=e;t.translations={}}r.prototype.load=t;r.prototype.translate=function e(t){var n="a-zA-Z0-9\\-_.\\/";var r=new RegExp("["+n+"]");var a=new RegExp("[^"+n+"\\]]");var i=0;var o=0;var s=t.length;var c=[];var l=false;function u(e){var t=e.length;var n=[];var r=0;var a=0;var i=0;while(r+2<=t){if(e.slice(r,r+2)==="[["){i+=1;r+=1}else if(e.slice(r,r+2)==="]]"){i-=1;r+=1}else if(i===0&&e[r]===","&&e[r-1]!=="\\"){n.push(e.slice(a,r).trim());r+=1;a=r}r+=1}n.push(e.slice(a,r+1).trim());return n}while(i+2<=s){if(t.slice(i,i+2)==="[["){c.push(t.slice(o,i));i+=2;o=i;l=true;var f=0;var g;var p=false;var v=false;var h=false;var m=false;while(i+2<=s){g=t.slice(i,i+2);if(!p&&r.test(g[0])){p=true;i+=1}else if(p&&!v&&g[0]===":"){v=true;i+=1}else if(v&&!h&&r.test(g[0])){h=true;i+=1}else if(h&&!m&&g[0]===","){m=true;i+=1}else if(!(p&&v&&h&&m)&&a.test(g[0])){i+=1;o-=2;l=false;if(f>0){f-=1}else{break}}else if(g==="[["){f+=1;i+=2}else if(g==="]]"){if(f===0){var d=t.slice(o,i);var y=u(d);var b=y[0];var w=y.slice(1);var j="";if(w&&w.length){j=this.translate(d)}c.push(this.translateKey(b,w,j));i+=2;o=i;l=false;break}f-=1;i+=2}else{i+=1}}}i+=1}var T=t.slice(o);if(l){T=this.translate(T)}c.push(T);return Promise.all(c).then(function(e){return e.join("")})};r.prototype.translateKey=function t(r,a,i){var o=this;var s=r.split(":",2);var c=s[0];var l=s[1];if(o.modules[c]){return Promise.resolve(o.modules[c](l,a))}if(c&&!l){n('Missing key in translation token "'+r+'"');return Promise.resolve("[["+c+"]]")}var u=this.getTranslation(c,l);return u.then(function(t){if(!t){n('Missing translation "'+r+'"');return i||l}var s=a.map(function(t){return e(t).collapseWhitespace().decodeHTMLEntities().escapeHTML().s.replace(/&amp;/g,"&")}).map(function(e){return o.translate(e)});return Promise.all(s).then(function(e){var n=t;e.forEach(function(e,t){var r=e.replace(/%(?=\d)/g,"&#37;").replace(/\\,/g,"&#44;");n=n.replace(new RegExp("%"+(t+1),"g"),r)});return n})})};r.prototype.getTranslation=function e(t,r){var a;if(!t){n("[translator] Parameter `namespace` is "+t+(t===""?"(empty string)":""));a=Promise.resolve({})}else{this.translations[t]=this.translations[t]||this.load(this.lang,t).catch(function(){return{}});a=this.translations[t]}if(r){return a.then(function(e){return e[r]})}return a};function i(e){var t=[];function n(e){if(e.nodeType===3){t.push(e)}else{for(var r=0,a=e.childNodes,i=a.length;r<i;r+=1){n(a[r])}}}n(e);return t}r.prototype.translateInPlace=function e(t,n){n=n||["placeholder","title"];var r=i(t);var a=r.map(function(e){return e.nodeValue}).join("  ||  ");var o=n.reduce(function(e,n){var r=Array.prototype.map.call(t.querySelectorAll("["+n+'*="[["]'),function(e){return[n,e]});return e.concat(r)},[]);var s=o.map(function(e){return e[1].getAttribute(e[0])}).join("  ||  ");return Promise.all([this.translate(a),this.translate(s)]).then(function(e){var t=e[0];var n=e[1];if(t){t.split("  ||  ").forEach(function(e,t){$(r[t]).replaceWith(e)})}if(n){n.split("  ||  ").forEach(function(e,t){o[t][1].setAttribute(o[t][0],e)})}})};r.getLanguage=function e(){var t;if(typeof window==="object"&&window.config&&window.utils){t=utils.params().lang||config.userLang||config.defaultLang||"en-GB"}else{var n=require("../../../src/meta");t=n.config.defaultLang||"en-GB"}return t};r.create=function e(t){if(!t){t=r.getLanguage()}r.cache[t]=r.cache[t]||new r(t);return r.cache[t]};r.cache={};r.registerModule=function e(t,n){r.moduleFactories[t]=n;Object.keys(r.cache).forEach(function(e){var a=r.cache[e];a.modules[t]=n(a.lang)})};r.moduleFactories={};r.removePatterns=function e(t){var n=t.length;var r=0;var a=0;var i=0;var o="";var s;while(r<n){s=t.slice(r,r+2);if(s==="[["){if(i===0){o+=t.slice(a,r)}i+=1;r+=2}else if(s==="]]"){i-=1;r+=2;if(i===0){a=r}}else{r+=1}}o+=t.slice(a,r);return o};r.escape=function e(t){return typeof t==="string"?t.replace(/\[\[/g,"&lsqb;&lsqb;").replace(/\]\]/g,"&rsqb;&rsqb;"):t};r.unescape=function e(t){return typeof t==="string"?t.replace(/&lsqb;|\\\[/g,"[").replace(/&rsqb;|\\\]/g,"]"):t};r.compile=function e(){var t=Array.prototype.slice.call(arguments,0).map(function(e){return e.replace(/%/g,"&#37;").replace(/,/g,"&#44;")});return"[["+t.join(", ")+"]]"};return r}();var o={Translator:i,compile:i.compile,escape:i.escape,unescape:i.unescape,getLanguage:i.getLanguage,translate:function e(t,r,a){var o=a;var s=r;if(typeof r==="function"){o=r;s=null}if(!(typeof t==="string"||t instanceof String)||t===""){return o("")}i.create(s).translate(t).catch(function(e){n("Translation failed: "+e.stack)}).then(function(e){o(e)}).catch(function(e){console.error(e)})},addTranslation:function e(t,n,a){i.create(t).getTranslation(n).then(function(e){r(e,a)})},getTranslations:function e(t,n,r){r=r||function(){};i.create(t).getTranslation(n).then(r)},load:function e(t,n,r){o.getTranslations(t,n,r)},toggleTimeagoShorthand:function e(){var t=r({},jQuery.timeago.settings.strings);jQuery.timeago.settings.strings=r({},o.timeagoShort);o.timeagoShort=r({},t)},prepareDOM:function e(){var t;switch(config.userLang){case"en-GB":case"en-US":t="en";break;case"fa-IR":t="fa";break;case"pt-BR":t="pt-br";break;case"nb":t="no";break;default:t=config.userLang;break}jQuery.getScript(config.relative_path+"/assets/vendor/jquery/timeago/locales/jquery.timeago."+t+".js").done(function(){jQuery(".timeago").timeago();o.timeagoShort=r({},jQuery.timeago.settings.strings);jQuery.getScript(config.relative_path+"/assets/vendor/jquery/timeago/locales/jquery.timeago."+t+"-short.js").done(function(){o.toggleTimeagoShorthand()})});o.translate("[[language:dir]]",function(e){if(e){jQuery("html").css("direction",e).attr("data-dir",e)}})}};return o});
//# sourceMappingURL=public/src/modules/translator.js.map