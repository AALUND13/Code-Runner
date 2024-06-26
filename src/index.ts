import 'dotenv/config';

import { Client, IntentsBitField } from "discord.js";
import { CommandKit } from "commandkit";
import { Utilities } from "utilities";

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent
    ]
});

new Utilities({
    databaseName: 'database',
    databaseLocation: `${__dirname}`,
})

new CommandKit({
    client,
    eventsPath: `${__dirname}/events`,
    commandsPath: `${__dirname}/commands`,
    devGuildIds: ['721236290938601542'],
    devUserIds: ['429810730691461130'],
    bulkRegister: true,
});

client.login(process.env.TOKEN);