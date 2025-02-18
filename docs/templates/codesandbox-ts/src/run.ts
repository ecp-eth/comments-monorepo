import { fetchComments } from '@ecp.eth/sdk'

const comments = await fetchComments({
  // the url of embed api
  apiUrl: 'https://embed.ethcomments.xyz',
  // the uri of commeting target
  targetUri: 'https://demo.ethcomments.xyz',
})

console.log('here is a list of comments for https://demo.ethcomments.xyz', JSON.stringify(comments, null, 2))
