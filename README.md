# WordSeek
<img width="1173" alt="Group 40 5" src="https://github.com/user-attachments/assets/bf444d36-2eea-4ad5-83e7-4a99acda2bfe" />

## Features
- Play the Wordle-inspired word guessing game in private chats or group chats.
- Supports multiplayer gameplay in groups, with admin tools for game management.
- Keep track of scores with group and global leaderboards.
- Commands to view personal scores and leaderboard rankings filtered by time (today, week, month, etc.).
- Flexible game settings: customizable limits for attempts and group admin permissions.

## How to Play
1. **Start a game**: Use the `/new` command in a group or private chat.
2. **Guess the word**: Players try to guess a random 5-letter word.
3. **Hints after each guess**:
   - 🟩 - Correct letter in the right spot.
   - 🟨 - Correct letter in the wrong spot.
   - 🟥 - Letter not in the word.
4. The game ends when:
   - The word is correctly guessed, or
   - Maximum number of guesses (30) is reached.
5. The first person to guess the word correctly wins!

## Commands
- **/new** - Start a new game.
- **/end** - End the current game (admins only in group chats).
- **/help** - Get help with commands and game rules.
- **/leaderboard** - View leaderboards for the group or globally. Example:
  ```
  /leaderboard global week
  ```
- **/score** - View your score. Example:
  ```
  /score group all
  /score @username group
  ```
- **/stats** - View bot usage stats (admin users only).

## Installation & Setup

### Requirements
- Bun.js Runtime (or Node.js)
- Telegram Bot Token (create one via [BotFather](https://core.telegram.org/bots#botfather))
- MongoDB database

### Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/binamralamsal/WordSeek
   cd WordSeek
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Configure environment variables**:
    Create a `.env` file in the root directory with the following variables:
    ```env
    BOT_TOKEN=your-telegram-bot-token
    MONGODB_URI=your-mongodb-connection-string
    MONGODB_DB=wordseek
    NODE_ENV=development
    ```

4. **Start the bot**:
   - **Development mode** (with hot reload):
     ```bash
     bun run dev
     ```
   - **Production mode**:
     ```bash
     bun run start
     ```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | Your Telegram bot token from BotFather | `123456789:ABCdefGHIjklMNOpqrsTUVwxyz` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://user:password@localhost:27017/wordseek` |
| `MONGODB_DB` | MongoDB database name | `wordseek` |
| `NODE_ENV` | Environment mode | `development` or `production` |

## Technologies Used
- **[grammy](https://grammy.dev/)**: Telegram Bot API framework.
- **MongoDB**: Persistent storage for game data, leaderboards, and caching.
- **Bun.js**: Blazing fast JavaScript runtime and package manager.
- **Zod**: Schema validation and type safety.

## Try the Bot
- **[WordSeek I](https://t.me/WordSeekBot)** *(Main bot)*
- **[WordSeek II](https://t.me/WordSeek2Bot)** *(Use this if the main bot is busy)*

## Community
- **Join the Official Group**: [Word Guesser Group](https://t.me/wordguesser) - Play the game, discuss strategies, and share feedback.
- **Support the Developer**: [Binamra Bots Channel](https://t.me/BinamraBots)
- **Contact the Developer**: Have suggestions or issues? Reach out on Telegram: [@binamralamsal](https://t.me/binamralamsal)

## Contributing
We welcome contributions to enhance the bot! Here's how you can help:

1. **Fork the repository** on GitHub.
2. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and ensure they follow the project's coding standards.
4. **Test your changes** thoroughly in development mode.
5. **Commit your changes** with descriptive commit messages:
   ```bash
   git commit -m "Add: new feature description"
   ```
6. **Push to your fork** and **open a pull request** with a clear description of your changes.

### Development Guidelines
- Follow the existing code style and structure.
- Add appropriate error handling for new features.
- Update documentation for any new commands or features.
- Test both private chat and group chat functionality.

## Troubleshooting

### Common Issues
- **Database connection errors**: Ensure MongoDB is running and the `MONGODB_URI` is correct.
- **Bot not responding**: Verify your `BOT_TOKEN` is valid and the bot is not already running elsewhere.
- **Migration errors**: Ensure you have proper database permissions and the database exists.

### Getting Help
If you encounter issues:
1. Check the [Issues](https://github.com/binamralamsal/WordSeek/issues) page on GitHub.
2. Join the [Word Guesser Group](https://t.me/wordguesser) for community support.
3. Contact the developer directly: [@binamralamsal](https://t.me/binamralamsal)

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
