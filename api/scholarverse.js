const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const TARGET_BASE = 'https://thescholarverse.site';

// 1. Subject Info Proxy
app.get('/api/subject-info', async (req, res) => {
    try {
        const response = await axios.get(`${TARGET_BASE}/api/SubjectInfo`, {
            params: req.query
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// 2. Topic Info Proxy (auto-fetches all pages and merges them together)
app.get('/api/topic-info', async (req, res) => {
    try {
        let page = 1;
        let allData = [];
        let fetching = true;

        while (fetching && page <= 10) { // Safety limit of 10 pages
            const response = await axios.get(`${TARGET_BASE}/api/TopicInfo`, {
                params: { ...req.query, page }
            });
            
            const result = response.data;
            if (result && result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
                allData = allData.concat(result.data);
                page++;
            } else {
                if (page === 1) {
                    allData = result.data || [];
                }
                fetching = false;
            }
        }

        res.json({ success: true, data: allData });
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// 3. Get Video URL Proxy
app.get('/api/get-video-url', async (req, res) => {
    try {
        const response = await axios.get(`${TARGET_BASE}/api/get-video-url`, {
            params: req.query
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// 4. Get Video with Keys Proxy
app.get('/api/get-video-with-keys', async (req, res) => {
    try {
        const response = await axios.get(`${TARGET_BASE}/api/get-video-with-keys`, {
            params: req.query
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// 5. Play / Manifest Proxy (handles DASH XML streams properly)
app.get('/api/play', async (req, res) => {
    try {
        const response = await axios.get(`${TARGET_BASE}/api/play`, {
            params: req.query,
            responseType: 'arraybuffer'
        });
        
        res.set('Content-Type', response.headers['content-type'] || 'application/dash+xml');
        res.set('Access-Control-Allow-Origin', '*');
        res.send(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).send(error.message);
    }
});

// 6. Get PDF Proxy
app.get('/api/get-pdf', async (req, res) => {
    try {
        const response = await axios.get(`${TARGET_BASE}/api/GetPdf`, {
            params: req.query
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// 7. Todays Schedule Proxy (POST Request)
app.post('/api/todays-schedule', async (req, res) => {
    try {
        const response = await axios.post(`${TARGET_BASE}/api/todays-schedule`, req.body);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// 8. Live Video Page Proxy
app.get('/api/live', async (req, res) => {
    try {
        const response = await axios.get(`${TARGET_BASE}/live`, {
            params: req.query,
            responseType: 'text'
        });
        res.send(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).send(error.message);
    }
});

// Vercel ke liye export karna zaroori hai
module.exports = app;
  
