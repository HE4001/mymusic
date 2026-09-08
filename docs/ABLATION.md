# 播放竞争消融

2026-09-08：Access及JWT消融已按用户要求移除。保留一个实际播放风险的消融，不增加生产绕过开关。

运行 `npm run test:ablation`。脚本在新的.cache/ablation隔离目录复制所需源文件，先验证22项基线（19项服务端、3项播放流程），再精确移除旧票据结果保护。

| 变体 | 结果 |
| --- | --- |
| baseline | 22/22通过 |
| remove-stale-ticket-guard | 恰好1个预期断言失败：旧A请求的票据覆盖最新B音频地址 |

本轮实际执行通过：无导入/语法错误、无额外失败。脚本退出0表示基线及消融均符合预期。机器报告写入[results.json](../.cache/ablation/results.json)，不提交缓存。

这项测试使用FakeAudio和模拟票据，不代表真实B2联调；实际源文件不变。
