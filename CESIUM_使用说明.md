# 🌍 Cesium 3D 地球使用说明

## 项目概述

本项目使用 **Cesium.js** 实现了一个交互式的 3D 地球可视化系统，可以在地球上添加和管理自定义坐标点。

## ✨ 已实现的功能

### 1. 3D 地球展示
- ✅ 高质量的 3D 地球渲染
- ✅ 真实地形数据
- ✅ 多种地图图层切换（卫星图、街道图等）
- ✅ 流畅的缩放、旋转、平移操作

### 2. 自定义坐标标记
- ✅ 在地球上添加自定义坐标点
- ✅ 每个标记点包含：名称、经纬度、描述信息
- ✅ 红色标记点 + 白色文字标签
- ✅ 点击标记可查看详细信息

### 3. 交互功能
- ✅ 动态添加新坐标点
- ✅ 删除已有坐标点
- ✅ 快速飞行到指定位置
- ✅ 坐标点列表管理

## 🚀 启动项目

\`\`\`bash
# 1. 确保依赖已安装
npm install

# 2. 启动开发服务器
npm run dev

# 3. 浏览器访问 http://localhost:5173
\`\`\`

## 📖 使用指南

### 添加新坐标点

1. 点击左侧面板的 "➕ 添加新坐标" 按钮
2. 填写以下信息：
   - **名称**：标记点的名称（如：东京塔）
   - **经度**：-180 到 180 之间的数值（东经为正，西经为负）
   - **纬度**：-90 到 90 之间的数值（北纬为正，南纬为负）
   - **描述**：可选的描述信息
3. 点击 "确认添加"

**经纬度示例：**
- 北京：经度 116.4074，纬度 39.9042
- 东京：经度 139.6917，纬度 35.6895
- 巴黎：经度 2.3522，纬度 48.8566
- 悉尼：经度 151.2093，纬度 -33.8688

### 飞行到指定位置

- 点击坐标列表中的 🎯 按钮，相机会平滑飞行到该位置

### 删除坐标点

- 点击坐标列表中的 🗑️ 按钮，即可删除该标记点

### 地球操作

- **旋转**：鼠标左键拖动
- **缩放**：鼠标滚轮 或 右键拖动
- **平移**：Ctrl + 左键拖动 或 中键拖动
- **倾斜**：Ctrl + 右键拖动 或 中键拖动

## 🔑 Cesium 访问令牌说明

### 当前状态
项目使用的是 Cesium 的**默认公共资源**，无需 API Token 即可运行基本功能。

### 如果需要高级功能（可选）

Cesium 提供了一些高级功能，需要注册并获取免费的访问令牌：

#### 1. 注册 Cesium Ion 账号

访问：https://cesium.com/ion/signup

#### 2. 获取访问令牌

1. 登录后访问：https://cesium.com/ion/tokens
2. 复制你的 "Default" token 或创建新的 token

#### 3. 在代码中配置令牌

在 `src/pages/BigScreen.vue` 的 `onMounted` 函数开始处添加：

\`\`\`javascript
onMounted(() => {
  // 配置 Cesium Ion 访问令牌（可选）
  Cesium.Ion.defaultAccessToken = '你的访问令牌';
  
  // ... 其他代码
})
\`\`\`

### 免费版功能限制

Cesium Ion 免费账户提供：
- ✅ 每月 50,000 次瓦片请求
- ✅ 全球地形数据
- ✅ 高分辨率卫星影像
- ✅ 3D 建筑物数据（部分城市）

对于大多数开发和演示用途，免费版已经足够。

## 🎨 功能扩展示例

### 自定义标记样式

修改 `addMarker` 函数中的样式：

\`\`\`javascript
point: {
  pixelSize: 20,              // 标记大小
  color: Cesium.Color.BLUE,   // 标记颜色
  outlineColor: Cesium.Color.YELLOW,  // 边框颜色
  outlineWidth: 3,            // 边框宽度
}
\`\`\`

### 添加图片标记

替换点标记为图片：

\`\`\`javascript
billboard: {
  image: '/path/to/icon.png',
  width: 32,
  height: 32,
}
\`\`\`

### 添加线条连接

连接两个坐标点：

\`\`\`javascript
viewer.entities.add({
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArray([
      经度1, 纬度1,
      经度2, 纬度2
    ]),
    width: 2,
    material: Cesium.Color.RED
  }
})
\`\`\`

### 添加多边形区域

\`\`\`javascript
viewer.entities.add({
  polygon: {
    hierarchy: Cesium.Cartesian3.fromDegreesArray([
      经度1, 纬度1,
      经度2, 纬度2,
      经度3, 纬度3,
    ]),
    material: Cesium.Color.RED.withAlpha(0.5),
    outline: true,
    outlineColor: Cesium.Color.BLACK
  }
})
\`\`\`

## 🆚 Cesium vs Google Earth API

### 为什么选择 Cesium？

| 特性 | Cesium | Google Earth API |
|------|--------|------------------|
| 开源 | ✅ 完全开源 | ❌ 已停止支持 |
| 维护状态 | ✅ 活跃开发 | ❌ 2015年停止 |
| 浏览器支持 | ✅ 现代浏览器 | ❌ 需要插件 |
| 商业使用 | ✅ Apache 2.0 | ❌ 已停止 |
| 3D 能力 | ✅ 强大 | ✅ 强大 |
| 性能 | ✅ 优秀 | - |
| 社区支持 | ✅ 活跃 | ❌ 无 |

### Cesium 的优势

1. **完全免费开源**：Apache 2.0 许可证
2. **功能强大**：支持 3D 建筑、地形、时间动画等
3. **性能优秀**：基于 WebGL，硬件加速
4. **持续更新**：由 Cesium 公司和社区维护
5. **丰富的 API**：可实现各种复杂的地理可视化
6. **数据格式支持**：CZML、KML、GeoJSON 等

## 📚 更多资源

- **Cesium 官网**：https://cesium.com/
- **API 文档**：https://cesium.com/docs/cesiumjs-ref-doc/
- **示例代码**：https://sandcastle.cesium.com/
- **社区论坛**：https://community.cesium.com/

## 🔧 常见问题

### Q: 地球显示为纯色或加载失败？

A: 检查网络连接，Cesium 需要从服务器加载地形和影像数据。

### Q: 如何提高性能？

A: 减少同时显示的标记数量，或使用聚合显示方式。

### Q: 可以离线使用吗？

A: 基础功能可以，但地形和影像数据需要在线加载。可以配置本地地形服务器。

### Q: 支持哪些数据格式？

A: KML、GeoJSON、CZML、TopoJSON、GPX 等主流地理数据格式。

## 💡 下一步开发建议

1. **数据持久化**：将坐标点保存到数据库
2. **批量导入**：支持从 CSV、JSON 文件导入坐标
3. **分类管理**：给标记点添加类别和图标
4. **轨迹动画**：实现移动物体的轨迹显示
5. **热力图**：展示数据密度分布
6. **实时数据**：连接 WebSocket 显示实时位置

---

**祝你使用愉快！** 🎉

