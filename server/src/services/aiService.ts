import OpenAI from 'openai'

const MAX_TAGS = 4
const MAX_TAG_LENGTH = 5

const client = new OpenAI({
  apiKey: process.env.SILICONFLOW_API_KEY as string,
  baseURL: process.env.SILICONFLOW_BASE_URL as string,
})

/**
 * 提取核心话题
 * @param content 笔记内容
 * @returns 话题名称
 */
export async function extractTopic(content: string): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages: [
        {
          role: 'user',
          content: `请分析以下笔记内容，提取出最核心的1个话题标签。
话题要求：
1. 简洁明了，2-8个汉字
2. 能准确概括内容主题
3. 避免过于宽泛（如"生活"、"日常"）
4. 避免过于具体（如"今天中午吃了什么"）

笔记内容：
${content}

请只返回话题名称，不要其他解释。`,
        },
      ],
      temperature: 0.3,
    })

    const topic = response.choices[0]?.message?.content?.trim() || '日常'
    // 简单的清洗，去除可能的标点
    return topic.replace(/[。，.、]/g, '')
  } catch (error) {
    console.error('AI extractTopic error:', error)
    return '日常' // 降级处理
  }
}

/**
 * 生成话题描述
 * @param topicName 话题名称
 * @param samplePosts 样本笔记内容列表
 * @returns 话题描述
 */
export async function generateTopicDescription(
  topicName: string,
  samplePosts: string[]
): Promise<string> {
  try {
    const postsText = samplePosts.join('\n---\n')
    const response = await client.chat.completions.create({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages: [
        {
          role: 'user',
          content: `基于以下话题名称和相关笔记样本，生成一段简洁的话题描述（20-50字）：
话题：${topicName}
样本笔记：
${postsText}

请只返回描述文本。`,
        },
      ],
      temperature: 0.7,
    })

    return (
      response.choices[0]?.message?.content?.trim() ||
      `${topicName}的相关内容分享`
    )
  } catch (error) {
    console.error('AI generateTopicDescription error:', error)
    return `${topicName}的相关内容分享`
  }
}

/**
 * 计算话题相似度，使用 Embedding
 * @param topic1 话题1
 * @param topic2 话题2
 * @returns 相似度 (0-1)
 */
export async function calculateTopicSimilarity(
  topic1: string,
  topic2: string
): Promise<number> {
  try {
    const response = await client.embeddings.create({
      model: 'BAAI/bge-m3',
      input: [topic1, topic2],
    })

    const embedding1 = response.data[0].embedding
    const embedding2 = response.data[1].embedding

    return cosineSimilarity(embedding1, embedding2)
  } catch (error) {
    console.error('AI calculateTopicSimilarity error:', error)
    // 降级为简单的字符串匹配
    return topic1 === topic2 ? 1 : 0
  }
}

/**
 * 提取笔记内容标签
 * @param content 笔记内容
 * @returns 标签数组 (1-4个)
 */
export async function extractTags(content: string): Promise<string[]> {
  try {
    const response = await client.chat.completions.create({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages: [
        {
          role: 'user',
          content: `请分析以下笔记内容，提取出1-${MAX_TAGS}个最相关的标签。
标签要求：
1. 每个标签2-${MAX_TAG_LENGTH}个汉字
2. 准确反映内容的关键主题或特征
3. 标签之间不重复，互相补充
4. 优先提取具体的概念、事物、情绪、场景等

笔记内容：
${content}

请只返回标签列表，用逗号分隔，不要其他解释。例如：美食,探店,周末,杭州,咖啡`,
        },
      ],
      temperature: 0.5,
    })

    const tagsText = response.choices[0]?.message?.content?.trim() || ''
    // 解析标签，去除空白和标点
    const tags = tagsText
      .split(/[,，、]/)
      .map(tag => tag.trim().replace(/[。，.、#]/g, ''))
      .filter(tag => tag.length >= 2 && tag.length <= MAX_TAG_LENGTH)
      .slice(0, MAX_TAGS)

    return tags.length > 0 ? tags : ['生活']
  } catch (error) {
    console.error('AI extractTags error:', error)
    return ['生活'] // 降级处理
  }
}

/**
 * 余弦相似度计算
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
