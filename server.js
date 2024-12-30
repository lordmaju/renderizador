const puppeteer = require('puppeteer'); // Para capturar a página
const express = require('express'); // Para criar o servidor
const app = express();

app.use(express.json()); // Permite receber JSON nas requisições

// Cria uma rota para renderizar a imagem
app.post('/render', async (req, res) => {
    const { url } = req.body; // Recebe a URL da página do Bubble

    if (!url) {
        return res.status(400).json({ error: 'URL é necessária!' });
    }

    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Captura a imagem da página
        const screenshot = await page.screenshot({ type: 'png', encoding: 'base64' });
        await browser.close();

        // Retorna a imagem em base64
        res.json({ image: `data:image/png;base64,${screenshot}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao renderizar a página.' });
    }
});

// Configura a porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});