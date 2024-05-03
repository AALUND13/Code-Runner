import axios from 'axios';
import { SlashCommandProps, CommandKit, CommandOptions } from 'commandkit';
import { SlashCommandBuilder, EmbedBuilder, Colors, TextChannel, Client, ChatInputCommandInteraction } from 'discord.js';
import { JavaScriptExecutor, IJavaScriptExecutorState, truncateString } from 'utilities';

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

    let codeToRun: string | undefined = await getCodeToRun(interaction, client, handler);;
    if (!codeToRun) return;
    
    // Use the new JavaScriptExecutionHandler from utilities package
    const javaScriptExecutor = await new JavaScriptExecutor(codeToRun, require, false, [], {}, 500).executes(async (executor) => {
        let embed = executeJavaScriptEmbed(executor.getState());

        // Reply with the captured console output
        await interaction.editReply({ embeds: [embed] });
    })
    
    console.log(javaScriptExecutor.getState())

    let embed = executeJavaScriptEmbed(javaScriptExecutor.getState());

    // Reply with the captured console output
    await interaction.editReply({ embeds: [embed] });
    
}

async function getCodeToRun(interaction: ChatInputCommandInteraction, client: Client, handler: CommandKit): Promise<string | undefined> {
    if (interaction.options.getString('command_string')) {
        let commandString = interaction.options.getString('command_string')
        if (commandString === null) {
            await interaction.editReply({ content: ':x: Error fetching string.' });
            return;
        }

        return commandString;
    } else if (interaction.options.getAttachment('command_attachment')) {
        let commandAttachment = interaction.options.getAttachment('command_attachment')
        if (commandAttachment === null) {
            await interaction.editReply({ content: ':x: Error fetching attachment.' });
            return;
        }

        return (await axios.get(commandAttachment.url, { responseType: 'text' })).data;
    } else if (interaction.options.getString('command_msg_id')) {
        try {
            let commandMsgId = interaction.options.getString('command_msg_id')
            if (commandMsgId === null) {
                await interaction.editReply({ content: ':x: Error fetching message ID.' });
                return;
            }

            const message = await (client.channels.cache.get(interaction.channelId) as TextChannel)?.messages.fetch(commandMsgId);
            
            return (message?.content.replace(/^```js|```$/g, '')).trim();
        } catch (error) {
            await interaction.editReply({ content: ':x: Error fetching message.' });
            return;
        }
    } else {
        await interaction.editReply({ content: ':x: You must provide a command to run.' });
        return;
    }
}

function executeJavaScriptEmbed(javaScriptExecutorState: IJavaScriptExecutorState): object {
    let returnValueText: string | undefined;
    let errorString: string | undefined
    try {
        returnValueText = javaScriptExecutorState.returnValue ? `\`\`\`js\n${truncateString(JSON.stringify(javaScriptExecutorState.returnValue , null, 2), 1000, true)}\`\`\`` : '\`\`\`\nNone\`\`\`';
    } catch (err: any) {
        returnValueText = "\`\`\`\nError: Could not stringify object.\`\`\`";
        errorString = `${javaScriptExecutorState.error?.name}: ${javaScriptExecutorState.error?.message}`;
    }

    let embed = new EmbedBuilder()
    .setTitle(executorColor(javaScriptExecutorState) === 0 ? ':x: Error' : executorColor(javaScriptExecutorState) === 1 ? ':arrows_counterclockwise: Running' : ':white_check_mark: Success')
    .setFields([
        {
            name: 'Code That Executed: ',
            value: `\`\`\`js\n${javaScriptExecutorState.code}\`\`\``,
            inline: false
        },
        {
            name: 'Console Output: ',
            value: javaScriptExecutorState.consoleOutput ? `\`\`\`\n${truncateString(javaScriptExecutorState.consoleOutput, 500, true)}\`\`\`` : '\`\`\`\nNone\`\`\`',
            inline: false
        },
        {
            name: 'Return Value: ',
            value: returnValueText,
            inline: false
        },
        {
            name: 'Error: ',
            value: javaScriptExecutorState.error ? `\`\`\`\n${`${javaScriptExecutorState.error?.name}: ${javaScriptExecutorState.error?.message}`}\n\`\`\`` : '\`\`\`\nNone\`\`\`',
            inline: false
        }
    ])
    .setColor(executorColor(javaScriptExecutorState) === 0 ? Colors.Red : executorColor(javaScriptExecutorState) === 1 ? Colors.Blue : Colors.Green);


    // Reply with the captured console output
    return embed;
}

function executorColor(javaScriptExecutorState: IJavaScriptExecutorState): number {
    if (javaScriptExecutorState.error) return 0
    else if (javaScriptExecutorState.isRunning) return 1
    else return 2;
}


export const options: CommandOptions = {
    devOnly: true,
}