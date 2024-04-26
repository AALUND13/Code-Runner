const axios = require('axios');
const { SlashCommandBuilder, EmbedBuilder, Colors, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { executeJavaScript } = require('utilities');
const { ButtonKit } = require('commandkit');

module.exports = {
    data: new SlashCommandBuilder()
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
    ),
    

    /**
     * @param {import('commandkit').SlashCommandProps} param0 
     * @param {import('commandkit').client} param0 
     * @param {import('commandkit').handler} param0 
     */
    run: async ({ interaction, client, handler }) => {
        const interactionmessage = await interaction.deferReply({ ephemeral: interaction.options.getBoolean('hidden'), fetchReply: true });

        let codeToRun;
        if (interaction.options.getString('command_string')) {
            codeToRun = interaction.options.getString('command_string');
        } else if (interaction.options.getAttachment('command_attachment')) {
            codeToRun = (await axios.get(interaction.options.getAttachment('command_attachment').url, { responseType: 'text' })).data;
        } else if (interaction.options.getString('command_msg_id')) {
            let message = await client.channels.cache.get(interaction.channelId).messages.fetch(interaction.options.getString('command_msg_id'));
            if (!message) {
                await interaction.editReply({ content: ':x: Message not found.' });
                return;
            }

            // Remove the code block syntax from the message content
            codeToRun = message.content.replace(/^```js|```$/g, '');
        
            // Trim any leading or trailing spaces
            codeToRun = codeToRun.trim();
        } else {
            await interaction.editReply({ content: ':x: You must provide a command to run.' });
            return;
        }

        const executeAgainButton = new ButtonKit()
            .setCustomId('execute_again_button')
            .setLabel('Execute Again')
            .setStyle(ButtonStyle.Primary);
        
        const buttonRow = new ActionRowBuilder().addComponents(executeAgainButton);

        // Execute JavaScript code using executeJavaScript()
        const { returnValue, consoleOutput, error } = await executeJavaScript(codeToRun, { interaction, client, handler }, require, 750);
        
        let returnValueText = undefined
        try {
            returnValueText = returnValue? `\`\`\`js\n${JSON.stringify(returnValue, null, 2)}\`\`\`` : '\`\`\`\nNone\`\`\`';
        } catch (err) {
            returnValueText = "\`\`\`\nError: Could not stringify object.\`\`\`"
            error = `${err.name}: ${err.message}`
        }

        let embed = new EmbedBuilder()
        .setTitle(`${error? ':x: Error' : ':white_check_mark: Success'}`)
        .setFields([
             {
                name: 'Code That Executed: ',
                value: `\`\`\`js\n${codeToRun}\`\`\``,
                inline: false
             },
             {
                name: 'Console Output: ',
                value: consoleOutput? `\`\`\`\n${consoleOutput}\`\`\`` : '\`\`\`\nNone\`\`\`',
                inline: false
             },
             {
                name: 'Return Value: ',
                value: returnValueText,
                inline: false
             },
             {
                name: 'Error: ',
                value: error? `\`\`\`\n${error}\n\`\`\`` : '\`\`\`\nNone\`\`\`',
                inline: false
             }
         ])
        .setColor(error? Colors.Red : Colors.Green);

        // Reply with the captured console output
        await interaction.editReply({ embeds: [embed], components: [buttonRow] });

        executeAgainButton.onClick(
            async (buttonInteraction) => {
                if (!handler.devUserIds.includes(buttonInteraction.user.id)) {
                    await buttonInteraction.reply({ content: ':x: Only the dev user can use this button.', ephemeral: true });
                    return;
                }            

                const { returnValue, consoleOutput, error } = await executeJavaScript(codeToRun, { interaction, client, handler }, require, 750);

                let returnValueText = undefined
                try {
                    returnValueText = returnValue? `\`\`\`js\n${JSON.stringify(returnValue, null, 2)}\`\`\`` : '\`\`\`\nNone\`\`\`';
                } catch (err) {
                    returnValueText = "\`\`\`\nError: Could not stringify object.\`\`\`"
                    error = `${err.name}: ${err.message}`
                }
        
                let embed = new EmbedBuilder()
                .setTitle(`${error? ':x: Error' : ':white_check_mark: Success'}`)
                .setFields([
                     {
                        name: 'Code That Executed: ',
                        value: `\`\`\`js\n${codeToRun}\`\`\``,
                        inline: false
                     },
                     {
                        name: 'Console Output: ',
                        value: consoleOutput? `\`\`\`\n${consoleOutput}\`\`\`` : '\`\`\`\nNone\`\`\`',
                        inline: false
                     },
                     {
                        name: 'Return Value: ',
                        value: returnValueText,
                        inline: false
                     },
                     {
                        name: 'Error: ',
                        value: error? `\`\`\`\n${error}\n\`\`\`` : '\`\`\`\nNone\`\`\`',
                        inline: false
                     }
                 ])
                .setColor(error? Colors.Red : Colors.Green);
                 
                buttonInteraction.update({ embeds: [embed], components: [buttonRow] });
            },
            { message: interactionmessage },
        );
    },

    options: {
        devOnly: true,
    }
};
