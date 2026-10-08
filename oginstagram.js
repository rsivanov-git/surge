// Route Instagram link-preview requests to OGInstagram.
// Signal uses WhatsApp/2. Leave browsers and the Instagram app untouched
// because OGInstagram redirects human visitors back to Instagram.
(function () {
  var headers = $request.headers || {};
  var userAgent = String(headers["User-Agent"] || headers["user-agent"] || "");
  var fetchMode = String(headers["Sec-Fetch-Mode"] || headers["sec-fetch-mode"] || "");

  var method = String($request.method || "GET").toUpperCase();
  if ((method !== "GET" && method !== "HEAD") ||
      fetchMode.toLowerCase() === "navigate" ||
      !/(?:WhatsApp|Signal|facebookexternalhit|TelegramBot|Discordbot|LinkPreview)/i.test(userAgent)) {
    $done({});
    return;
  }

  var match = /^https:\/\/(?:(?:www|m)\.)?instagram\.com\/([^?#]*)(?:\?([^#]*))?(?:#.*)?$/i.exec($request.url);
  if (!match) {
    $done({});
    return;
  }

  var path = match[1].replace(/\/$/, "");
  var content = /^(?!share\/)(?:[A-Za-z0-9._]{1,30}\/)?(?:p|reel|reels)\/[A-Za-z0-9_-]{1,24}$/.test(path);
  var story = /^stories\/(?!highlights\/)[A-Za-z0-9._]{1,30}\/[0-9]{1,32}$/.test(path);
  var profile = /^[A-Za-z0-9._]{1,30}$/.test(path) &&
    !/^(?:accounts|api|about|developer|developers|direct|directory|emails|explore|legal|oauth|p|press|privacy|reel|reels|stories|terms|web|challenge|graphql|static|ads|download|nametag|share|your_activity)$/i.test(path);
  if (!content && !story && !profile) {
    $done({});
    return;
  }

  // Strip tracking, but preserve the chosen carousel image (1-based).
  var query = "";
  if (content && match[2]) {
    var image = /(?:^|&)img_index=([1-9][0-9]*)(?:&|$)/.exec(match[2]);
    if (image) query = "?img_index=" + image[1];
  }

  var targetHeaders = {};
  Object.keys(headers).forEach(function (key) {
    // Do not send Instagram credentials or origin headers to the preview service.
    if (!/^(?:host|:authority|cookie|authorization|proxy-authorization|origin|referer)$/i.test(key) &&
        !/^x-(?:ig-|instagram-|fb-|csrf)/i.test(key)) {
      targetHeaders[key] = headers[key];
    }
  });
  targetHeaders.Host = "oginstagram.com";
  $done({url: "https://oginstagram.com/" + path + "/" + query, headers: targetHeaders});
})();
