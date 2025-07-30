const express = require('express')
const app = express()
const port = 3000

const config = {
    host: 'db',
    user: 'root',
    password: 'root',
    database: 'nodedb'
}

const mysql = require('mysql')

app.get('/', async (req, res) => {
    // Criar conexão para cada request
    const connection = mysql.createConnection(config)
    
    // Criar tabela se não existir
    const createTable = `CREATE TABLE IF NOT EXISTS people (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
    )`
    
    // Inserir um nome aleatório
    const names = ['Wesley', 'João', 'Maria', 'José', 'Ana', 'Carlos', 'Lucia', 'Pedro']
    const randomName = names[Math.floor(Math.random() * names.length)]
    const insertSQL = `INSERT INTO people(name) VALUES('${randomName}')`
    
    // Buscar todos os nomes
    const selectSQL = `SELECT name FROM people`
    
    connection.query(createTable, (err) => {
        if (err) {
            console.log('Erro ao criar tabela:', err)
            return res.status(500).send('Erro interno')
        }
        
        connection.query(insertSQL, (err) => {
            if (err) {
                console.log('Erro ao inserir:', err)
                return res.status(500).send('Erro interno')
            }
            
            connection.query(selectSQL, (err, results) => {
                connection.end()
                
                if (err) {
                    console.log('Erro ao buscar:', err)
                    return res.status(500).send('Erro interno')
                }
                
                let namesList = '<ul>'
                results.forEach(row => {
                    namesList += `<li>${row.name}</li>`
                })
                namesList += '</ul>'
                
                const html = `
                    <h1>Full Cycle Rocks!</h1>
                    ${namesList}
                `
                
                res.send(html)
            })
        })
    })
})

app.listen(port, () => {
    console.log('Rodando na porta ' + port)
})