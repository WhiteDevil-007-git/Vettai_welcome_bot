require('dotenv').config();

const Canvas = require('canvas');
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    AttachmentBuilder
} = require('discord.js');

const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 📊 JOIN STATS + RAID
let joinCount = 0;
let joinLog = [];

// ✅ READY + AUTO ROLE CREATE
client.once('clientReady', async () => {
    console.log(`✅ VettaiWelcome is online as ${client.user.tag}`);

    const guild = client.guilds.cache.first();

    const rolesToCreate = [
        'FPS',
        'Open World',
        'Survival',
        'RPG',
        'Mobile Gamer',
        'Racing',
        'Strategy',
        'Casual Gamer'
    ];

    for (const roleName of rolesToCreate) {
        const exists = guild.roles.cache.find(r => r.name === roleName);

        if (!exists) {
            await guild.roles.create({
                name: roleName,
                reason: 'Auto-created by bot'
            });
            console.log(`✅ Created role: ${roleName}`);
        }
    }
});


// 🎉 MEMBER JOIN
client.on('guildMemberAdd', async (member) => {

    const channel = member.guild.channels.cache.find(
        ch => ch.name === config.welcomeChannel
    );

    if (!channel) return;

    joinCount++;

    const now = Date.now();
    joinLog.push(now);
    joinLog = joinLog.filter(t => now - t < 10000);

    if (joinLog.length >= 5) {
        channel.send("🚨 Raid detected! Too many joins!");
    }

    // 🖼️ IMAGE
    const canvas = Canvas.createCanvas(700, 250);
    const ctx = canvas.getContext('2d');

    try {
        const background = await Canvas.loadImage('./bg.png');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } catch {
        ctx.fillStyle = '#23272A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Welcome', 250, 80);

    ctx.font = '36px sans-serif';
    ctx.fillText(member.user.username, 250, 140);

    const avatar = await Canvas.loadImage(
        member.user.displayAvatarURL({ extension: 'jpg' })
    );

    ctx.drawImage(avatar, 50, 50, 150, 150);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });

    // 💎 EMBED (UNCHANGED)
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Welcome to Vettaiyaadu Vilaiyaadu 🎯')
        .setDescription(
            `Welcome ${member} to **${member.guild.name}**.\n\n` +
            `Please take a moment to review the server guidelines and set up your roles:\n\n` +
            `📌 **Rules:** <#${config.rulesChannelId}>\n` +
            `🎭 **Roles:** <#${config.rolesChannelId}>\n\n` +
            `🎮 Select the games you play using the menu below to personalize your experience.\n\n` +
            `We hope you enjoy your time here.`
        )
        .setImage('attachment://welcome.png')
        .setFooter({ text: `Member #${member.guild.memberCount} • Welcome to the community` });

    // 🎮 DROPDOWN
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`role_${member.id}`)
            .setPlaceholder('🎮 Select your gaming interests')
            .setMinValues(1)
            .setMaxValues(3)
            .addOptions([
                { label: 'FPS Games', value: 'fps', emoji: '🎯' },
                { label: 'Open World', value: 'openworld', emoji: '🌍' },
                { label: 'Survival', value: 'survival', emoji: '⛏️' },
                { label: 'RPG', value: 'rpg', emoji: '⚔️' },
                { label: 'Mobile Games', value: 'mobile', emoji: '📱' },
                { label: 'Racing', value: 'racing', emoji: '🏎️' },
                { label: 'Strategy', value: 'strategy', emoji: '🧠' },
                { label: 'Casual Gamer', value: 'casual', emoji: '🎮' }
            ])
    );

    await channel.send({
        embeds: [embed],
        components: [row],
        files: [attachment]
    });

    // 📩 DM (UNCHANGED)
    try {
        await member.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('Welcome to Vettaiyaadu Vilaiyaadu 🎯')
                    .setDescription(
                        `Hello ${member.user.username},\n\n` +
                        `Welcome to **${member.guild.name}**.\n\n` +
                        `To get started, please review the rules and choose your roles:\n\n` +
                        `📌 **Rules:** <#${config.rulesChannelId}>\n` +
                        `🎭 **Roles:** <#${config.rolesChannelId}>\n\n` +
                        `After joining, select the games you play to unlock relevant channels.\n\n` +
                        `If you need any assistance, feel free to contact our staff team:\n\n` +
                        `👑 <@1393841760081547361>\n` +
                        `⚡ <@1114099582633267251>\n` +
                        `🛠️ <@1432680169461645463>\n\n` +
                        `We’re here to help you anytime.\n\n` +
                        `— This bot was developed by Kamalesh, Founder of Vettaiyaadu Vilaiyaadu`
                    )
            ]
        });
    } catch {
        console.log("❌ DM failed");
    }
});


// 🔒 DROPDOWN HANDLER (REMOVE OLD + ADD NEW)
client.on('interactionCreate', async interaction => {

    if (!interaction.isStringSelectMenu()) return;

    const [type, userId] = interaction.customId.split('_');

    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: "❌ This menu is not for you.",
            ephemeral: true
        });
    }

    const selectedValues = interaction.values;

    const roleMap = {
        fps: 'FPS',
        openworld: 'Open World',
        survival: 'Survival',
        rpg: 'RPG',
        mobile: 'Mobile Gamer',
        racing: 'Racing',
        strategy: 'Strategy',
        casual: 'Casual Gamer'
    };

    const allRoles = Object.values(roleMap);

    // ❌ REMOVE OLD ROLES
    for (const roleName of allRoles) {
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (role && interaction.member.roles.cache.has(role.id)) {
            await interaction.member.roles.remove(role);
        }
    }

    // ✅ ADD NEW ROLES
    for (const value of selectedValues) {
        const roleName = roleMap[value];
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);

        if (role) {
            await interaction.member.roles.add(role);
        }
    }

    await interaction.reply({
        content: `✅ Roles updated successfully!`,
        ephemeral: true
    });
});


// ⚡ COMMAND
client.on('messageCreate', async (message) => {

    if (message.content === '!welcomeall') {

        if (message.author.id !== config.ownerId) {
            return message.reply("❌ Not allowed.");
        }

        const members = await message.guild.members.fetch();

        const sorted = members
            .filter(m => !m.user.bot)
            .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);

        const list = sorted.map((m, i) => `${i + 1}. <@${m.id}>`).join('\n');

        await message.channel.send({
            content: `📋 **Members:**\n\n${list}`,
            allowedMentions: { parse: [] }
        });
    }
});

client.login(process.env.TOKEN);