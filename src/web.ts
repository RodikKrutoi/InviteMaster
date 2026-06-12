import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req: Request, res: Response) => {
    res.send('Bot is running!');
});

app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`✅ Web server is listening on port ${PORT}`);
});

export default app