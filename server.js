// Carregar variáveis de ambiente
require('dotenv').config();

const puppeteer = require('puppeteer');
const express = require('express');
const axios = require('axios'); // Para fazer requisições HTTP, como enviar o webhook
const app = express();

app.use(express.json()); // Permite que o app receba dados JSON no corpo das requisições

// A chave secreta do app, obtida das variáveis de ambiente no Railway
const SECRET_KEY = process.env.SECRET_KEY; // Chave secreta configurada no Railway

// Log para verificar se a chave de ambiente está sendo carregada corretamente
console.log("SECRET_KEY do Railway:", SECRET_KEY);

// Endpoint para renderizar e capturar a imagem
app.post('/render', async (req, res) => {
    const { url, webhookUrl, userKey } = req.body;  // Espera o URL, Webhook e a chave do usuário

    // Log para verificar as informações recebidas na requisição
    console.log("Dados recebidos na requisição:", req.body);

    // Verifica se a chave do app na requisição é válida
    const appKey = req.headers['authorization'];  // Pega o valor do cabeçalho "Authorization"
    console.log("Chave do app na requisição:", appKey); // Log para verificar a chave recebida

    if (!appKey || appKey !== `Bearer ${SECRET_KEY}`) {
        console.log("Erro: Chave de API do app inválida!");
        return res.status(403).json({ error: 'Chave de API do app inválida!' });
    }

    if (!userKey) {
        console.log("Erro: Chave do usuário não fornecida!");
        return res.status(400).json({ error: 'Chave do usuário é necessária!' });
    }

    if (!url || !webhookUrl) {
        console.log("Erro: URL ou Webhook não fornecidos!");
        return res.status(400).json({ error: 'URL e Webhook são necessários!' });
    }

    // Gera um ID de tarefa único para rastrear a tarefa
    const taskId = Date.now().toString();  // Usando a hora atual como ID único

    // Log para verificar o ID da tarefa gerado
    console.log("ID da tarefa gerado:", taskId);

    // Processa a renderização de forma assíncrona
    processRender(taskId, url, webhookUrl, userKey);

    // Retorna imediatamente o ID da tarefa para o cliente
    res.json({ taskId });
});

// Função que processa a renderização em background
async function processRender(taskId, url, webhookUrl, userKey) {
    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true // Mantenha em modo headless para otimizar recursos
        });

        const page = await browser.newPage();

        console.log("Configurando a viewport...");
        await page.setViewport({ width: 1500, height: 1500 });

        console.log(`Navegando para a URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });

        const elementSelector = '#templete'; // Substitua pelo seletor do seu elemento
        await page.waitForSelector(elementSelector); // Espera o elemento carregar

        console.log("Capturando o elemento...");
        const element = await page.$(elementSelector);
        const screenshotBuffer = await element.screenshot({ type: 'png' });

        // Envia a imagem renderizada para o webhook com sucesso
        console.log("Enviando imagem para o webhook...");
        await axios.post(webhookUrl, {
            taskId: taskId,
            userKey: userKey,  // Inclui a chave do usuário para o Bubble saber quem solicitou
            status: 'completed',
            result: `data:image/png;base64,${screenshotBuffer.toString('base64')}`
        });

        // Fecha o navegador depois de capturar a imagem
        await browser.close();
    } catch (error) {
        // Se houver erro, marca a tarefa como falhada
        console.error("Erro durante a renderização:", error.message);
        await axios.post(webhookUrl, {
            taskId: taskId,
            userKey: userKey,  // Inclui a chave do usuário para o Bubble saber quem solicitou
            status: 'failed',
            result: error.message
        });
    }
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});