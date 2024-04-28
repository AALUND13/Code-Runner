import axios from 'axios';
import { SlashCommandProps, ButtonKit } from 'commandkit';
import { SlashCommandBuilder, EmbedBuilder, Colors, ButtonStyle, ActionRowBuilder, TextChannel, MessageActionRowComponentBuilder } from 'discord.js';
import { executeJavaScript, LocalDatabase } from 'utilities';

export const data = new SlashCommandBuilder()
    .setName('run_code')
    .setDescription('Run code.')
    .addStringOption((option) =>
    option
        .setName('command_string')
        .setDescription('Enter the command as a string.')
    )
    .addAttachmentOption((option) =>
    option
        .setName('command_attachment')
        .setDescription('Select a file containing the command.')
    )
    .addStringOption((option) =>
    option
        .setName('command_msg_id')
        .setDescription('Enter the ID of a message containing the command.')    
    )
    .addBooleanOption((option) =>
    option
        .setName('hidden')
        .setDescription('Whether the response should be hidden to everyone except the command invoker.')
    );
 
export async function run({ interaction, client, handler }: SlashCommandProps) {
    const interactionmessage = await interaction.deferReply({ ephemeral: interaction.options.getBoolean('hidden') ?? false, fetchReply: true });

    let codeToRun: string;
    if (interaction.options.getString('command_string')) {
        let commandString = interaction.options.getString('command_string')
        if (commandString === null) {
            await interaction.editReply({ content: ':x: Error fetching string.' });
            return;
        }

        codeToRun = commandString;
    } else if (interaction.options.getAttachment('command_attachment')) {
        let commandAttachment = interaction.options.getAttachment('command_attachment')
        if (commandAttachment === null) {
            await interaction.editReply({ content: ':x: Error fetching attachment.' });
            return;
        }

        codeToRun = (await axios.get(commandAttachment.url, { responseType: 'text' })).data;
    } else if (interaction.options.getString('command_msg_id')) {
        try {
            let commandMsgId = interaction.options.getString('command_msg_id')
            if (commandMsgId === null) {
                await interaction.editReply({ content: ':x: Error fetching message ID.' });
                return;
            }

            const message = await (client.channels.cache.get(interaction.channelId) as TextChannel)?.messages.fetch(commandMsgId);

            // Remove the code block syntax from the message content
            codeToRun = message?.content.replace(/^```js|```$/g, '') || '';

            // Trim any leading or trailing spaces
            codeToRun = codeToRun.trim();
        } catch (error) {
            await interaction.editReply({ content: ':x: Error fetching message.' });
            return;
        }
    } else {
        await interaction.editReply({ content: ':x: You must provide a command to run.' });
        return;
    }

    const executeAgainButton = new ButtonKit()
        .setCustomId('execute_again_button')
        .setLabel('Execute Again')
        .setStyle(ButtonStyle.Primary);

        const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(executeAgainButton);

    // Execute JavaScript code using executeJavaScript()
    let { returnValue, consoleOutput, error } = await executeJavaScript(codeToRun, { interaction, client, handler }, require, 750);

    let returnValueText: string | undefined;
    try {
        returnValueText = returnValue ? `\`\`\`js\n${JSON.stringify(returnValue, null, 2)}\`\`\`` : '\`\`\`\nNone\`\`\`';
    } catch (err) {
        if (err instanceof Error) {
            returnValueText = "\`\`\`\nError: Could not stringify object.\`\`\`";
            error = `${err.name}: ${err.message}`;
        } else {
            // If the error is not an instance of Error (shouldn't happen in practice), handle it accordingly
            returnValueText = "\`\`\`\nError: Could not stringify object.\`\`\`";
            error = `${err}`;
        }
    }
    

    let embed = new EmbedBuilder()
        .setTitle(`${error ? ':x: Error' : ':white_check_mark: Success'}`)
        .setFields([
            {
                name: 'Code That Executed: ',
                value: `\`\`\`js\n${codeToRun}\`\`\``,
                inline: false
            },
            {
                name: 'Console Output: ',
                value: consoleOutput ? `\`\`\`\n${consoleOutput}\`\`\`` : '\`\`\`\nNone\`\`\`',
                inline: false
            },
            {
                name: 'Return Value: ',
                value: returnValueText,
                inline: false
            },
            {
                name: 'Error: ',
                value: error ? `\`\`\`\n${error}\n\`\`\`` : '\`\`\`\nNone\`\`\`',
                inline: false
            }
        ])
        .setColor(error ? Colors.Red : Colors.Green);

    // Reply with the captured console output
    await interaction.editReply({ embeds: [embed], components: [buttonRow] });

    executeAgainButton.onClick(
        async (buttonInteraction) => {
            if (!handler.devUserIds.includes(buttonInteraction.user.id)) {
                await buttonInteraction.reply({ content: ':x: Only the dev user can use this button.', ephemeral: true });
                return;
            }

            if (interaction.options.getString('command_string')) {
                let commandString = interaction.options.getString('command_string')
                if (commandString === null) {
                    await interaction.editReply({ content: ':x: Error fetching string.' });
                    return;
                }
        
                codeToRun = commandString;
            } else if (interaction.options.getAttachment('command_attachment')) {
                let commandAttachment = interaction.options.getAttachment('command_attachment')
                if (commandAttachment === null) {
                    await interaction.editReply({ content: ':x: Error fetching attachment.' });
                    return;
                }
        
                codeToRun = (await axios.get(commandAttachment.url, { responseType: 'text' })).data;
            } else if (interaction.options.getString('command_msg_id')) {
                try {
                    let commandMsgId = interaction.options.getString('command_msg_id')
                    if (commandMsgId === null) {
                        await interaction.editReply({ content: ':x: Error fetching message ID.' });
                        return;
                    }
        
                    const message = await (client.channels.cache.get(interaction.channelId) as TextChannel)?.messages.fetch(commandMsgId);
        
                    // Remove the code block syntax from the message content
                    codeToRun = message?.content.replace(/^```js|```$/g, '') || '';
        
                    // Trim any leading or trailing spaces
                    codeToRun = codeToRun.trim();
                } catch (error) {
                    await interaction.editReply({ content: ':x: Error fetching message.' });
                    return;
                }
            }

            let { returnValue, consoleOutput, error } = await executeJavaScript(codeToRun, { interaction, client, handler }, require, 750);

            let returnValueText: string | undefined;
            try {
                returnValueText = returnValue ? `\`\`\`js\n${JSON.stringify(returnValue, null, 2)}\`\`\`` : '\`\`\`\nNone\`\`\`';
            } catch (err) {
                if (err instanceof Error) {
                    returnValueText = "\`\`\`\nError: Could not stringify object.\`\`\`";
                    error = `${err.name}: ${err.message}`;
                } else {
                    // If the error is not an instance of Error (shouldn't happen in practice), handle it accordingly
                    returnValueText = "\`\`\`\nError: Could not stringify object.\`\`\`";
                    error = `${err}`;
                }
            }

            let embed = new EmbedBuilder()
                .setTitle(`${error ? ':x: Error' : ':white_check_mark: Success'}`)
                .setFields([
                    {
                        name: 'Code That Executed: ',
                        value: `\`\`\`js\n${codeToRun}\`\`\``,
                        inline: false
                    },
                    {
                        name: 'Console Output: ',
                        value: consoleOutput ? `\`\`\`\n${consoleOutput}\`\`\`` : '\`\`\`\nNone\`\`\`',
                        inline: false
                    },
                    {
                        name: 'Return Value: ',
                        value: returnValueText,
                        inline: false
                    },
                    {
                        name: 'Error: ',
                        value: error ? `\`\`\`\n${error}\n\`\`\`` : '\`\`\`\nNone\`\`\`',
                        inline: false
                    }
                ])
                .setColor(error ? Colors.Red : Colors.Green);

            buttonInteraction.update({ embeds: [embed], components: [buttonRow] });
        },
        { message: interactionmessage },
    );
}