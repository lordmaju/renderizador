const puppeteer = require('puppeteer'); // Para capturar páginas
const express = require('express'); // Para criar o servidor
const app = express();

// Permite receber JSON no body da requisição
app.use(express.json());

// Endpoint para renderizar e capturar o elemento específico
app.post('/render', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL é necessária!' });
    }

    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] }); // Inicia o navegador
        const page = await browser.newPage();

        // Define uma viewport inicial (ajuda no carregamento da página)
        await page.setViewport({ width: 1500, height: 1500 });

        // Navega até a URL fornecida
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Seletor do elemento que será capturado
        const elementSelector = '#templete'; // Substitua por um seletor válido
        await page.waitForSelector(elementSelector); // Aguarda o elemento aparecer

        // Ajusta o tamanho do elemento para 1500x1500 pixels
        await page.evaluate((selector) => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.width = '1500px';
                element.style.height = '1500px';
            }
        }, elementSelector);

        // Captura somente o elemento especificado
        const element = await page.$(elementSelector); // Seleciona o elemento
        const screenshot = await element.screenshot({ type: 'png', encoding: 'base64' }); // Captura o elemento como PNG

        await browser.close(); // Fecha o navegador

        // Retorna a imagem em base64
        res.json({ image: `data:image/png;base64,${screenshot}` });
    } catch (error) {
        console.error(error); // Exibe erros no terminal
        res.status(500).json({ error: 'Erro ao renderizar o elemento.' });
    }
});

// Configura a porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});