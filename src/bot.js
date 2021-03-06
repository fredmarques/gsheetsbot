const Telegraf = require('telegraf');
const config = require('./config');
const debugMiddleware = require('./middlewares/debug');
const logMiddleware = require('telegraf-logfile');
const adminMiddleware = require('./middlewares/admin');
const userMiddleware = require('./middlewares/user');
const commands = require('./commands');
const actions = require('./actions');

const bot = new Telegraf(config.telegram.token);
// session in memory (ctx.session)
bot.use(Telegraf.memorySession());
// output debug logs to the screen
bot.use(debugMiddleware);
// log all telegram updates to a log file
bot.use(logMiddleware(config.log));
// add flags to check if the user has admin privileges to the state
bot.use(adminMiddleware);
// add a displayName property to the state
// build from first/last/username when available
bot.use(userMiddleware);
// setup all /commandName commands see src/commands/index.js
Object.keys(commands).forEach(name => {
    bot.command(name, ...commands[name]);
});
// setup all calback handlers
Object.keys(actions).forEach(name => {
    bot.action(new RegExp(`(${name}) *(.*)`), Telegraf.compose(actions[name]));
});
// text input handler
// used mostly to fill forms
bot.on('text', (ctx, next) => {
    const { update, updateType } = ctx;
    if (updateType !== 'message') {
        return next();
    }
    const { text, entities } = update.message;
    if (entities && entities[0].type === 'bot_command') {
        return next();
    }
    const awaitingInput = ctx.session.awaitingInput;
    if (awaitingInput) {
        switch (awaitingInput) {
        case 'signup':
            ctx.session.answers.push(text);
            break;
        default:
            break;
        }
        return Telegraf.compose(commands[awaitingInput])(ctx, next);
    }
    return next();
});
// bot daemon start
// TODO: replace polling with webhooks
bot.startPolling();

