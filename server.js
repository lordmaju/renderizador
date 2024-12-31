// Carrega as variáveis de ambiente
require('dotenv').config();

const puppeteer = require('puppeteer');
const express = require('express');
const axios = require('axios'); // Para enviar a notificação para o Bubble
const app = express();

app.use(express.json()); // Permite receber JSON no corpo da requisição

// A chave secreta para autenticação do app, obtida da variável de ambiente
const SECRET_KEY = process.env.SECRET_KEY;  // Usa a variável de ambiente

// Simulação de banco de dados de usuários
let users = {}; // Armazenará o status das tarefas com o taskId e associando ao usuário

// Endpoint para renderizar e capturar a imagem
app.post('/render', async (req, res) => {
    const { url, webhookUrl, userKey } = req.body;  // Espera o URL, Webhook e a chave do usuário

    // Verificar se a chave do app na requisição é válida
    const appKey = req.headers['authorization'];  // Pega o valor do cabeçalho "Authorization"
    if (!appKey || appKey !== `Bearer ${SECRET_KEY}`) {
        return res.status(403).json({ error: 'Chave de API do app inválida!' });
    }

    if (!userKey) {
        return res.status(400).json({ error: 'Chave do usuário é necessária!' });
    }

    if (!url || !webhookUrl) {
        return res.status(400).json({ error: 'URL e Webhook são necessários!' });
    }

    // Gera um ID de tarefa único para rastrear a tarefa
    const taskId = Date.now().toString();  // Usando a hora atual como ID único

    // Associa o taskId ao usuário
    users[taskId] = { userKey: userKey, status: 'in-progress', result: null };

    console.log(`Iniciando a tarefa de renderização para o ID: ${taskId} de usuário: ${userKey}`);

    // Processa a renderização de forma assíncrona
    processRender(taskId, url, webhookUrl, userKey);

    // Retorna imediatamente o ID da tarefa
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

        // Atualiza o status da tarefa para "concluída"
        users[taskId].status = 'completed';
        users[taskId].result = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;

        // Envia a notificação do webhook para o Bubble
        await axios.post(webhookUrl, {
            taskId: taskId,
            userKey: userKey,  // Inclui a chave do usuário para o Bubble saber quem solicitou
            status: 'completed',
            result: users[taskId].result
        });

        await browser.close();
    } catch (error) {
        // Se houver erro, marca a tarefa como falhada
        users[taskId].status = 'failed';
        users[taskId].result = error.message;

        // Notifica o erro via webhook
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