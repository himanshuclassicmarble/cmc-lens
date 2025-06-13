import Replicate from 'replicate'
import dotenv from 'dotenv'
dotenv.config()

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
  userAgent: 'https://www.npmjs.com/package/create-replicate'
})
const model = 'zsxkib/jina-clip-v2:5050c3108bab23981802011a3c76ee327cc0dbfdd31a2f4ef1ee8ef0d3f0b448'
const input = {
  text: 'A cute fox',
  image: 'https://images.stockcake.com/public/f/b/a/fba4da70-95d2-4e86-825b-38c32b15f678_large/fox-in-flight-stockcake.jpg',
  embedding_dim: 64,
  output_format: 'base64',
}

console.log('Using model: %s', model)
console.log('With input: %O', input)

console.log('Running...')
const output = await replicate.run(model, { input })
console.log('Done!', output)
