const BasePouchCommand = require('../BasePouchCommand')
const fs = require('fs-extra')
const path = require('path')
const { COMMANDS, buildCommand } = require('../../../../constants')

/**
 * 记忆保存锦囊命令
 * 负责将知识、经验和最佳实践保存到记忆库中
 */
class RememberCommand extends BasePouchCommand {
  constructor () {
    super()
  }

  getPurpose () {
    return '增强AI长期记忆能力，主动内化专业知识、最佳实践和项目经验'
  }

  async getContent (args) {
    const content = args.join(' ')

    if (!content) {
      return this.getUsageHelp()
    }

    try {
      const memoryEntry = await this.saveMemory(content)

      return this.formatSaveResponse(content, memoryEntry)
    } catch (error) {
      return `❌ 记忆内化失败：${error.message}

💡 可能的原因：
- AI记忆体系目录权限不足
- 磁盘空间不够
- 记忆内容格式问题

🔧 解决方案：
1. 检查 .promptx 目录权限
2. 确保磁盘空间充足
3. 检查记忆内容是否包含特殊字符`
    }
  }

  /**
   * 将知识内化到AI记忆体系（紧凑格式）
   */
  async saveMemory (value) {
    // 1. 确保AI记忆体系目录存在
    const memoryDir = await this.ensureMemoryDirectory()

    // 2. 使用单一记忆文件
    const memoryFile = path.join(memoryDir, 'declarative.md')

    // 3. 格式化为一行记忆
    const memoryLine = this.formatMemoryLine(value)

    // 4. 追加到记忆文件
    const action = await this.appendToMemoryFile(memoryFile, memoryLine)

    return {
      value,
      filePath: memoryFile,
      action,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 确保AI记忆体系目录存在
   */
  async ensureMemoryDirectory () {
    const promptxDir = path.join(process.cwd(), '.promptx')
    const memoryDir = path.join(promptxDir, 'memory')

    await fs.ensureDir(memoryDir)

    return memoryDir
  }

  /**
   * 格式化为一行记忆（紧凑格式）
   */
  formatMemoryLine (value) {
    const now = new Date()
    const timestamp = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    // 自动生成标签
    const tags = this.generateTags(value)

    return `- ${timestamp} ${value} #${tags} #评分:8 #有效期:长期`
  }

  /**
   * 自动生成标签
   */
  generateTags (value) {
    const tags = []
    const lowerValue = value.toLowerCase()

    // 基于value生成标签
    if (lowerValue.includes('最佳实践') || lowerValue.includes('规则')) tags.push('#最佳实践')
    if (lowerValue.includes('流程') || lowerValue.includes('步骤')) tags.push('#流程管理')
    if (lowerValue.includes('命令') || lowerValue.includes('工具')) tags.push('#工具使用')

    return tags.join(' ') || '#其他'
  }

  /**
   * 追加到记忆文件
   */
  async appendToMemoryFile (memoryFile, memoryLine) {
    // 初始化文件（如果不存在）
    if (!await fs.pathExists(memoryFile)) {
      await fs.writeFile(memoryFile, `# 陈述性记忆

## 高价值记忆（评分 ≥ 7）

${memoryLine}

`)
      return 'created'
    }

    // 读取现有内容
    const content = await fs.readFile(memoryFile, 'utf-8')

    // 追加新记忆（在高价值记忆部分）
    const updatedContent = content + '\n\n' + memoryLine
    await fs.writeFile(memoryFile, updatedContent)
    return 'created'
  }

  /**
   * 格式化保存响应（简化版本）
   */
  formatSaveResponse (value, memoryEntry) {
    const { action, timestamp } = memoryEntry

    const actionLabels = {
      created: '✅ AI已内化新记忆'
    }

    return `${actionLabels[action]}：${value}

## 📋 记忆详情
- **内化时间**: ${timestamp.split('T')[0]}
- **知识内容**: ${value.length > 100 ? value.substring(0, 100) + '...' : value}

## 🎯 能力增强效果
- ✅ **知识已内化到AI长期记忆**
- ✅ **可通过recall命令主动检索**
- ✅ **支持跨会话记忆保持**

## 🔄 下一步行动：
- 记忆检索: 验证知识内化效果
  命令: \`${buildCommand.recall(value)}\`
- 能力强化: 学习相关知识增强记忆
  命令: \`${buildCommand.learn('<protocol>://<resource-id>')}\`
- 应用实践: 在实际场景中运用记忆
  命令: \`${buildCommand.action('<role-id>')}\`

📍 当前状态：memory_saved`
  }

  /**
   * 获取使用帮助
   */
  getUsageHelp () {
    return `🧠 **Remember锦囊 - AI记忆增强系统**

## 📖 基本用法
\`\`\`bash
${buildCommand.remember('<知识内容>')}
\`\`\`

## 💡 记忆内化示例

### 📝 AI记忆内化
AI学习和内化各种专业知识
\`\`\`bash
${buildCommand.remember('"构建代码 → 运行测试 → 部署到staging → 验证功能 → 发布生产"')}
${buildCommand.remember('"用户反馈视频加载慢，排查发现是CDN配置问题，修改后加载速度提升60%"')}
${buildCommand.remember('"React Hooks允许在函数组件中使用state和其他React特性"')}
${buildCommand.remember('"每个PR至少需要2个人review，必须包含测试用例"')}
\`\`\`

## 🔍 记忆检索与应用
\`\`\`bash
${buildCommand.recall('<关键词>')}    # AI主动检索记忆
${buildCommand.action('<role-id>')}   # AI运用记忆激活角色
\`\`\`

🔄 下一步行动：
  - 开始记忆: 内化第一条知识
    命令: ${buildCommand.remember('<content>')}
  - 学习资源: 学习新知识再内化
    命令: ${buildCommand.learn('<protocol>://<resource>')}`
  }

  /**
   * 获取PATEOAS导航信息
   */
  getPATEOAS (args) {
    const content = args.join(' ')

    if (!content) {
      return {
        currentState: 'remember_awaiting_input',
        availableTransitions: ['hello', 'learn', 'recall'],
        nextActions: [
          {
            name: '查看角色',
            description: '选择角色获取专业知识',
            command: COMMANDS.HELLO,
            priority: 'medium'
          },
          {
            name: '学习资源',
            description: '学习新知识然后保存',
            command: buildCommand.learn('<protocol>://<resource>'),
            priority: 'high'
          }
        ]
      }
    }

    return {
      currentState: 'memory_saved',
      availableTransitions: ['recall', 'learn', 'action', 'remember'],
      nextActions: [
        {
          name: '检索记忆',
          description: '测试记忆是否可检索',
          command: buildCommand.recall('<关键词>'),
          priority: 'high'
        },
        {
          name: '学习强化',
          description: '学习相关知识加强记忆',
          command: buildCommand.learn('<protocol>://<resource>'),
          priority: 'medium'
        },
        {
          name: '应用记忆',
          description: '在实际场景中应用记忆',
          command: buildCommand.action('<role-id>'),
          priority: 'medium'
        },
        {
          name: '继续内化',
          description: 'AI继续内化更多知识',
          command: buildCommand.remember('<content>'),
          priority: 'low'
        }
      ],
      metadata: {
        savedMemory: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        memoryLength: content.length,
        timestamp: new Date().toISOString(),
        systemVersion: '锦囊串联状态机 v1.0'
      }
    }
  }
}

module.exports = RememberCommand
