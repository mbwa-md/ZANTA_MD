const {
    getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson
} = require('./lib/functions');

const commands = [];
const replyHandlers = [];

/**
 * Command එකක් Register කිරීම සඳහා
 * @param {object} options - Command එකේ විකල්ප
 * @param {string} options.pattern - Command එකේ නම (prefix නැතුව)
 * @param {string} options.desc - කෙටි විස්තරය
 * @param {string} options.category - ප්‍රධාන කාණ්ඩය (උදා: General, Group)
 * @param {string} options.categoryName - කාණ්ඩයේ ප්‍රදර්ශනය වන නම
 * @param {string} [options.react] - Command එක ලැබුණු විට දෙන Reaction emoji එක
 * @param {boolean} [options.isOwner=false] - Owner පමණක්ද?
 * @param {boolean} [options.isGroup=false] - Group එකක් තුළ පමණක්ද?
 * @param {boolean} [options.isAdmins=false] - Sender Admin විය යුතුද?
 * @param {boolean} [options.isBotAdmins=false] - Bot එක Admin විය යුතුද?
 * @param {function} func - Command එකේ ක්‍රියාකාරීත්වය
 */
function command(options, func) {
    if (!options.pattern) throw new Error('Pattern is required for a command.');
    
    // Command එකේ default values
    const commandObject = {
        pattern: options.pattern,
        desc: options.desc || '',
        category: options.category || 'General',
        categoryName: options.categoryName || 'General Commands',
        react: options.react || '',
        isOwner: options.isOwner || false,
        isGroup: options.isGroup || false,
        isAdmins: options.isAdmins || false,
        isBotAdmins: options.isBotAdmins || false,
        function: func
    };

    commands.push(commandObject);
}


/**
 * Reply Handler එකක් Register කිරීම සඳහා (Command එකක් නොවන විට ලැබෙන Messages සඳහා)
 * @param {function} filter - Message එක filter කරන function එක (true/false return කරයි)
 * @param {function} func - Message එක ලැබුණු විට ක්‍රියාත්මක වන function එක
 */
function replyHandler(filter, func) {
    replyHandlers.push({
        filter: filter,
        function: func
    });
}


// --- 🚀 COMMANDS REGISTRATION START ---


// 1. General Command (ප්‍රධාන)
command({
    pattern: 'alive',
    desc: 'Bot එක ක්‍රියාත්මක වේදැයි පරීක්ෂා කරයි.',
    category: 'General',
    categoryName: "General Commands",
    react: '🤖'
}, async (zanta, mek, m, { reply, pushname }) => {
    const uptime = runtime(process.uptime());
    const text = `*ZANTA-MD* Bot is Alive! ✅\n\n> ⏰ Uptime: ${uptime}\n> 👋 Hello ${pushname}!`;
    reply(text);
});

// 2. Sticker Command (Media)
command({
    pattern: 'sticker',
    desc: 'Image/Video එකක් Sticker එකක් බවට පත් කරයි.',
    category: 'Media',
    categoryName: "Media Commands",
    react: '✨'
}, async (zanta, mek, m, { reply }) => {
    try {
        if (!m.quoted || (m.quoted.mtype !== 'imageMessage' && m.quoted.mtype !== 'videoMessage')) {
            return reply("Sticker සෑදීමට Image එකක් හෝ Video එකක් Reply කරන්න.");
        }

        const buffer = await mek.quoted.download();
        
        await zanta.sendMessage(m.from, { 
            sticker: buffer 
        }, { quoted: mek });
        
    } catch (e) {
        console.error("Sticker Command Error:", e);
        reply('❌ Sticker සෑදීමට අපොහොසත් විය.');
    }
});


// 3. 👥 Group Management Command (පරීක්ෂා කිරීම සඳහා)
command({
    pattern: 'kick',
    desc: 'Group එකේ කෙනෙක් kick කරන්න.',
    category: 'Group',
    categoryName: "Group Management",
    react: '👋',
    isGroup: true,       // 👈 Group එකක් තුළ පමණක් ක්‍රියාත්මක විය යුතුයි
    isAdmins: true,      // 👈 Sender Admin විය යුතුයි
    isBotAdmins: true    // 👈 Bot එක Admin විය යුතුයි
}, async (zanta, mek, m, { reply, args }) => {
    
    // Kick කිරීමට අවශ්‍ය JID එක සොයා ගැනීම
    let target = mek.mentionedJid ? mek.mentionedJid[0] : m.quoted ? m.quoted.participant : args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null;

    if (!target) {
        return reply("කික් කිරීමට අවශ්‍ය කෙනා Mention කරන්න, හෝ Message එකක් Reply කරන්න.");
    }
    
    if (target === zanta.user.id) {
        return reply("මට මාවම කික් කරන්න බැහැ!");
    }

    try {
        await zanta.groupParticipantsUpdate(m.from, [target], 'remove');
        reply(`✅ ${target.split('@')[0]} සාමාජිකයා Group එකෙන් ඉවත් කරන ලදි.`);
    } catch (e) {
        console.error("Kick Error:", e);
        reply('❌ සාමාජිකයා ඉවත් කිරීමට අපොහොසත් විය. (සාමාජිකයා Admin කෙනෙක් විය හැකිය)');
    }
});

// 4. Owner Command
command({
    pattern: 'jid',
    desc: 'Chat ID එක ලබා දෙන Command එක.',
    category: 'Owner',
    categoryName: "Owner Commands",
    react: '🔑',
    isOwner: true // 👈 Owner පමණක් භාවිතයට
}, async (zanta, mek, m, { from, sender }) => {
    reply(`*🔑 Chat ID:* ${from}\n*👤 Sender ID:* ${sender}`);
});


// --- 🔁 REPLY HANDLERS REGISTRATION START ---

// 1. Text Reply Handler (උදාහරණයක්)
replyHandler((text) => text.toLowerCase().includes('hello'), 
    async (zanta, mek, m, { reply, sender }) => {
    // 9474...@s.whatsapp.net වැනි format එකකින්
    if (sender.startsWith('9477')) {
        reply('මම ඉන්නේ 94743404814 එක්කයි. 😄');
    }
});

// --- 🔁 REPLY HANDLERS REGISTRATION END ---


module.exports = {
    command,
    commands,
    replyHandler,
    replyHandlers
};
