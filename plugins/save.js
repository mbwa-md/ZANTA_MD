const { cmd, commands } = require("../command");

cmd(
  {
    pattern: "save",
    alias: ["resend"],
    react: "💾",
    desc: "Saves (Resends) a quoted Status or View Once media.",
    category: "utility",
    filename: __filename,
  },
  async (
    zanta,
    mek,
    m,
    {
      from,
      quoted,
      reply,
    }
  ) => {
    try {
      // Check if a message is quoted
      if (!quoted) {
        return reply("*Please reply to the Status/View Once Photo/Video you want to save.* 💾");
      }

      // --- 1. Identify and Extract the Media Message ---
      let mediaMsg = quoted.msg;
      
      // Handle View Once messages: The actual content is nested inside 'message'
      if (quoted.msg && quoted.msg.viewOnce) {
        mediaMsg = quoted.msg.message;
      }
      
      // Determine the type of media and extract the relevant object
      let mediaType = "";
      let mediaData = null;
      let caption = mediaMsg.caption || quoted.caption || "";

      if (mediaMsg.imageMessage) {
        mediaType = "image";
        mediaData = mediaMsg.imageMessage;
      } else if (mediaMsg.videoMessage) {
        mediaType = "video";
        mediaData = mediaMsg.videoMessage;
      }
      
      // Check if a valid media type was found
      if (!mediaData || !mediaType) {
        return reply("*The quoted message is not a recognizable Photo, Video, or View Once media.* ☹️");
      }
      
      // --- 2. Download the Media ---
      
      // We must pass the correct object to zanta.downloadMediaMessage
      // In Baileys, the 'quoted' message object can usually download its own media.
      // We rely on the existing zanta.downloadMediaMessage function to handle the quoted object correctly.
      
      const mediaBuffer = await zanta.downloadMediaMessage(quoted);
      
      if (!mediaBuffer) {
          return reply("*Could not download media from the quoted message. Check if it's a recent status or media.* 🙁");
      }

      // --- 3. Resend the Media ---
      
      const messageOptions = {
        caption: `*💾 Saved Media (${mediaType.toUpperCase()}):*\n${caption}`,
      };
      
      // Resend the media
      if (mediaType === "image") {
        await zanta.sendMessage(from, { image: mediaBuffer, ...messageOptions }, { quoted: mek });
      } else if (mediaType === "video") {
        await zanta.sendMessage(from, { video: mediaBuffer, ...messageOptions }, { quoted: mek });
      } 
      
      return reply("*Saved and Resent Successfully! 🙃✅*");
      
    } catch (e) {
      console.error(e);
      // More specific error message for debugging
      reply(`*Error during save:* ${e.message || e}\n\n*Possible fix:* Try deleting session and reconnecting.`);
    }
  }
);
