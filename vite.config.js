import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Plugin customizado para ler diretórios locais e retornar como JSON
function localDirectoryApi() {
  return {
    name: 'local-directory-api',
    configureServer(server) {
      server.middlewares.use('/api/local-dir', (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const dirPath = url.searchParams.get('path');
        
        if (!dirPath) {
          res.statusCode = 400;
          return res.end(JSON.stringify({error: 'path missing'}));
        }

        try {
          // Resolve o caminho a partir da raiz do projeto
          const absolutePath = path.resolve(process.cwd(), dirPath);
          
          if (!fs.existsSync(absolutePath)) {
             res.statusCode = 404;
             return res.end(JSON.stringify({error: 'directory not found'}));
          }

          const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
          
          const result = entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile()
          }));
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({error: e.message}));
        }
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    localDirectoryApi()
  ],
})
