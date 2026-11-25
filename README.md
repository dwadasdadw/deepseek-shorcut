# DeepSeek Flash 字段捷径

飞书多维表格的 FaaS 字段捷径。每次运行读取当前记录中配置的字段值，组成提示词，调用字段设置里选定的 DeepSeek 模型。飞书将返回的正文填入当前行的捷径单元格。插件直接使用飞书运行时发请求，无需自建服务器。

## 配置字段

1. 新建 **DeepSeek Flash** 字段捷径，填写 **DeepSeek API Key**。可以在 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 创建 Key。
2. 在 **提示词** 中写指令。把光标放在需要插入数据的位置，点击右侧「引用字段」并选择当前表中的列。升级时，若使用过 `{{字段1}}` 等旧版占位符，请改为飞书插入的字段标签。
3. 在 **模型名** 里手动填写 DeepSeek 模型 ID，例如 `deepseek-flash` 或 `deepseek-v4-pro`。留空时使用 `deepseek-flash`，模型是否可用由 DeepSeek API 决定。[DeepSeek Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)
4. 在 **思考模式** 里选择开启或关闭，默认关闭。开启时可选 **思考强度** 为低、高或最高，默认高。关闭模式时强度设置不生效。单元格写入模型的最终回复。[DeepSeek 思考模式](https://api-docs.deepseek.com/guides/thinking_mode/)
5. 保存后先在一行示例数据上生成，确认结果，再按需批量生成或启用自动更新。

提示词可纯手写，也可以在任意位置重复插入同一个引用。字段类型和取值方式由飞书的「引用字段」控件决定。

Key 填在字段设置的普通输入框里。请将能查看或编辑字段配置的成员视为可以接触这把 Key，并在调试或使用时按表格的数据权限决定哪些内容可以发送给 DeepSeek。源码和发布包只包含字段定义，不包含实际 Key。

## 本地调试

在本项目目录运行以下命令。本地已用 Node.js 24 验证。项目固定使用飞书 CLI `1.0.1-alpha.10`，该版本可在 Windows 上运行字段调试。`1.0.1-alpha.11` 的本地调试会解析错 Windows 路径。

```powershell
npm.cmd ci
npm.cmd start
```

打开 [飞书 FaaS 字段捷径调试模板](https://feishu.feishu.cn/base/DiQXbSLkSaGmwUsHkfJcAscunlh?table=tblwp5TejhYSjeNU&view=vewPbLApNL) 并复制副本，或在测试表的侧边栏插件市场搜索「字段捷径调试助手」。在助手中打开字段配置面板，填写提示词，按需插入引用字段，再填写测试 Key。保持本地服务和调试助手打开，点击「调试字段」，检查样例记录的结果。

## 发布

1. 先按上面的步骤跑通测试表中的一行，再按 `Ctrl+C` 停止本地服务。需要重新打包时，在本项目目录运行 `npm.cmd run pack`，出现「是否同时生成工作流自定义节点插件」时直接回车选择 No。上传 CLI 打印的 `dist/field/output_*.zip`。再次调试或打包会重建 `dist/field`，需要保留旧版时先把 ZIP 复制到其他目录。
2. 登录飞书，按[字段捷径插件开发指南](https://feishu.feishu.cn/docx/SZFpd9v6EoHMI7xEhWhckLLfnBh)中的「发布捷径」操作。飞书团队的公开文档给出的提交入口是[多维表格捷径插件表单](https://feishu.feishu.cn/share/base/form/shrcnwTXnFVAbMPOSeaOFwIAnbf)，并说明需提供 GitHub 项目。若你的账号打开后显示迁移提示或需要申请发布权限，按账号里可见的最新入口提交。如有同步和异步执行选项，建议选择异步，为思考模式留出更多时间。[飞书团队公开版 FaaS 指南](https://github.com/Lark-Base/customAI-shortcut/blob/master/faas.md#发布捷径)
3. 如果发布表单要求填写名称和说明，可用「DeepSeek Flash」和「用自定义提示词处理当前记录，生成文本并填入捷径字段」。发布完成后，在目标多维表格中新建字段，从「探索字段捷径」里搜索发布时填写的名称，添加并配置。[飞书字段捷径入口说明](https://www.feishu.cn/content/ai-powered-multidimensional-tables-easy-shortcuts-for-beginners)

运行失败时，飞书接收相应的错误码。可按表格提示检查 Key、DeepSeek 余额、限流或提示词长度。[DeepSeek API 错误码](https://api-docs.deepseek.com/quick_start/error_codes/)
