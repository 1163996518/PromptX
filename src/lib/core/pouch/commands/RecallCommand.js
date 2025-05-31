const BasePouchCommand = require('../BasePouchCommand');
const fs = require('fs-extra');
const path = require('path');

/**
 * 记忆检索锦囊命令
 * 负责从记忆库中检索相关知识和经验
 */
class RecallCommand extends BasePouchCommand {
  constructor() {
    super();
  }

  getPurpose() {
    return 'AI主动检索记忆中的专业知识、最佳实践和历史经验';
  }

  async getContent(args) {
    const [query] = args;

    try {
      const memories = await this.getAllMemories(query);
      
      if (memories.length === 0) {
        return `🧠 AI记忆体系中暂无内容。

💡 建议：
1. 使用 promptx remember 内化新知识
2. 使用 promptx learn 学习后再内化
3. 开始构建AI的专业知识体系`;
      }

      const formattedMemories = this.formatRetrievedKnowledge(memories, query);
      
      return `🧠 AI记忆体系 ${query ? `检索"${query}"` : '全部记忆'} (${memories.length}条)：

${formattedMemories}

💡 记忆运用建议：
1. 结合当前任务场景灵活运用
2. 根据实际情况调整和变通
3. 持续学习和增强记忆能力`;
    } catch (error) {
      return `❌ 检索记忆时出错：${error.message}`;
    }
  }

  getPATEOAS(args) {
    const [query] = args;
    
    if (!query) {
      return {
        currentState: 'recall-waiting',
        availableTransitions: ['hello', 'learn'],
        nextActions: [
          {
            name: '查看领域',
            description: '查看可检索的领域',
            command: 'promptx hello'
          }
        ]
      };
    }

    const domain = this.extractDomain(query);
    
    return {
      currentState: `recalled-${query}`,
      availableTransitions: ['action', 'learn', 'remember'],
      nextActions: [
        {
          name: '应用记忆',
          description: `使用检索到的${query}知识`,
          command: `promptx action ${query}`
        },
        {
          name: '深入学习',
          description: `学习更多${domain}知识`,
          command: `promptx learn ${domain}`
        },
        {
          name: '增强记忆',
          description: 'AI内化新的知识增强记忆',
          command: `promptx remember ${query}-update`
        },
        {
          name: '相关检索',
          description: '检索相关领域知识',
          command: `promptx recall ${this.getRelatedQuery(query)}`
        }
      ],
      metadata: {
        query: query,
        resultCount: this.lastSearchCount || 0,
        searchTime: new Date().toISOString()
      }
    };
  }

  /**
   * 获取所有记忆（紧凑格式）
   */
  async getAllMemories(query) {
    this.lastSearchCount = 0;
    const memories = [];
    
    // 读取单一记忆文件
    const memoryFile = path.join(process.cwd(), '.promptx/memory/declarative.md');
    
    try {
      if (await fs.pathExists(memoryFile)) {
        const content = await fs.readFile(memoryFile, 'utf-8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('- ')) {
            // 解析记忆行
            const memory = this.parseMemoryLine(line);
            if (memory && (!query || this.matchesMemory(memory, query))) {
              memories.push(memory);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading memories:', error);
    }

    this.lastSearchCount = memories.length;
    return memories;
  }

  /**
   * 解析记忆行（紧凑格式）
   */
  parseMemoryLine(line) {
    // 格式：- 2025/05/31 14:30 内容 #key #tag1 #tag2 #评分:8 #有效期:长期
    const match = line.match(/^- (\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}) (.*?) (#\w+.*?)$/);
    if (!match) return null;
    
    const [, timestamp, content, tagsStr] = match;
    const tags = tagsStr.split(' ').filter(t => t.startsWith('#'));
    const keyTag = tags.find(t => !t.includes(':') && !['#敏捷开发', '#测试', '#部署', '#前端开发', '#后端开发', '#AI', '#最佳实践', '#流程管理', '#工具使用', '#其他'].includes(t));
    
    return {
      timestamp,
      content,
      key: keyTag ? keyTag.substring(1) : 'unknown',
      tags,
      source: keyTag ? keyTag.substring(1) : 'unknown'
    };
  }

  /**
   * 检查记忆是否匹配查询
   */
  matchesMemory(memory, query) {
    const lowerQuery = query.toLowerCase();
    return memory.content.toLowerCase().includes(lowerQuery) ||
           memory.key.toLowerCase().includes(lowerQuery) ||
           memory.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
  }

  matchesQuery(content, query) {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const keywords = lowerQuery.split(/\s+/);
    
    return keywords.some(keyword => lowerContent.includes(keyword));
  }

  /**
   * 格式化检索到的记忆（紧凑格式）
   */
  formatRetrievedKnowledge(memories, query) {
    return memories.map((memory, index) => {
      const content = memory.content.length > 120 ? 
        memory.content.substring(0, 120) + '...' : 
        memory.content;
        
      return `📝 ${index + 1}. **${memory.key}** (${memory.timestamp})

${content}

${memory.tags.slice(0, 5).join(' ')}

---`;
    }).join('\n\n');
  }

  extractDomain(query) {
    const domains = ['copywriter', 'scrum', 'developer', 'test', 'prompt'];
    const lowerQuery = query.toLowerCase();
    
    return domains.find(domain => lowerQuery.includes(domain)) || null;
  }

  getRelatedQuery(query) {
    const relatedMap = {
      'copywriter': 'marketing',
      'scrum': 'agile',
      'frontend': 'ui',
      'backend': 'api',
      'test': 'qa'
    };
    
    for (const [key, value] of Object.entries(relatedMap)) {
      if (query.toLowerCase().includes(key)) {
        return value;
      }
    }
    
    return query + '-advanced';
  }
}

module.exports = RecallCommand; 