# 美国宏观周期与资本市场预期工作台 ｜ Eugene Finance (CME Workbench v1.0)

> **US Macro Cycle & Capital Market Expectations (CME) Simulation Workbench**  
> *100% 映射 CFA Level III 资本市场预期 11 张核心框架图谱 · 阶段一纯仿真沙盘 + Phase 2 FRED/ALFRED 实证桥接契约*

---

## 一、 11 张核心框架图谱映射架构

| 工作台阶段 | 映射图谱 | 核心功能与量化模型 |
| :--- | :--- | :--- |
| **01 数据陷阱与偏差审计** | 图1（预测挑战） | Time Lags 滞后、ALFRED Point-in-Time vs 修订后前瞻偏差、Geltner 估值去平滑 ($\sigma_{\text{true}} = \sigma_{\text{rep}}\sqrt{(2-\alpha)/\alpha}$)、体制变革样本窗口对比、比索问题尾部扣除、条件信息收缩权重 $\lambda$ |
| **02 增长拆解与外生冲击** | 图3、图11 | Solow 增长分解（劳动力 + 资本深化 + TFP）、美股长期价值锚定 ($V_e = \text{GDP} \times S_k \times PE$)、为什么高增长 $\neq$ 高股市回报陷阱预警、外生冲击 6 大来源与 GFC 后 Type 1/2/3 增长路径压力测试 |
| **03 预测方法与周期五阶段** | 图4、图5、图6 | 计量模型 vs LEI/Nowcasting vs 主观清单法三合一权重集成引擎、商业周期 5 阶段波形定位、通胀与通缩 × 四大资产（现金/名义债/股票/房地产）情景矩阵 |
| **04 泰勒规则与政策曲线** | 图7、图8、图9 | 泰勒规则 ($i^* = r_{\text{neutral}} + \pi_e + 0.5(Y_e-Y_{\text{trend}}) + 0.5(\pi_e-\pi_{\text{target}})$)、推拉绳子效应、自动稳定器、ZIRP/NIRP 零下限突破与存款便利/现金摩擦边界、2×2 财政×货币政策矩阵、美债 3M–30Y 曲线形态、LDI 养老金特例与债务通胀螺旋风险 |
| **05 国际联动与双赤字超调** | 图10 | 国民收入与“镜子镜像”恒等式 $(X-M)=(S-I)+(T-G)$、不可能三角三态切换、Grexit 倒挂风险、Dornbusch 汇率超调 20 季度收敛路径与 PPP 投资期内失效 |
| **06 7步法CME跨资产矩阵** | 图2（7步总纲） | 输出美国 7 大资产类别无条件/条件/混合预期回报、真实波动率、夏普比、风险-收益散点与 7×7 动态相关性热力图，并提供第 7 步“结果监控与误差归因反馈”模拟器与 Markdown 报告导出 |

---

## 二、 本地运行与单元测试

```bash
cd e:\AMP\cme-macro-workbench

# 运行核心数学引擎单元测试 (Taylor规则 / 国民收入恒等式 / Geltner去平滑 / 外生冲击路径 / 2x2政策矩阵)
npm test

# 启动开发服务器 (默认端口 5179)
npm run dev

# 类型检查与生产打包
npm run build
```
