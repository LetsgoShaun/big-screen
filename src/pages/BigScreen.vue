<script setup>
import { onMounted, ref } from 'vue'
import * as Cesium from 'cesium'

const cesiumContainer = ref(null)
let viewer = null
const ZOOM_THRESHOLD = 50000 // 缩放阈值（米），相机高度大于此值时显示小红点

// 右侧详情面板相关
const detailPanelVisible = ref(false)
const selectedLocation = ref(null)

// 悬浮提示标签
let hoverLabel = null

// 筛选条件
const selectedRobotType = ref('全部')
const selectedCountry = ref('全部')

// 机器人类型列表
const robotTypes = ['全部', '干挂式', '分布式', 'AGV']

// 国家列表
const countries = ['全部', '中国', '日本', '美国']

// 电站数据列表
const stationData = ref([
  {
    id: 1,
    name: '安徽合肥光伏电站',
    longitude: 117.137899,
    latitude: 31.830709,
    cameraHeight: 1000,
    robotCount: 15,
    robotTypes: ['干挂式', '分布式'],
    description: '大型地面光伏电站，采用先进的清洁机器人系统',
    capacity: '100MW',
    country: '中国',
    province: '安徽省',
    owner: '国家电投',
    epc: '中国电建',
    operation: '阳光电源',
    image: 'https://via.placeholder.com/400x200?text=Hefei+Station'
  },
  {
    id: 2,
    name: '北京分布式电站',
    longitude: 116.4074,
    latitude: 39.9042,
    cameraHeight: 1000,
    robotCount: 8,
    robotTypes: ['分布式', 'AGV'],
    description: '城市分布式光伏项目，智能运维管理',
    capacity: '50MW',
    country: '中国',
    province: '北京市',
    owner: '华能集团',
    epc: '中国能建',
    operation: '远景能源',
    image: 'https://via.placeholder.com/400x200?text=Beijing+Station'
  },
  {
    id: 3,
    name: '上海智能光伏园区',
    longitude: 121.4737,
    latitude: 31.2304,
    cameraHeight: 1000,
    robotCount: 20,
    robotTypes: ['干挂式', 'AGV'],
    description: '工业园区屋顶光伏，全自动清洁系统',
    capacity: '80MW',
    country: '中国',
    province: '上海市',
    owner: '上海电力',
    epc: '上海电气',
    operation: '晶科能源',
    image: 'https://via.placeholder.com/400x200?text=Shanghai+Station'
  },
  {
    id: 4,
    name: '广州新能源基地',
    longitude: 113.2644,
    latitude: 23.1291,
    cameraHeight: 1000,
    robotCount: 12,
    robotTypes: ['干挂式', '分布式'],
    description: '综合能源示范项目，多种机器人协同作业',
    capacity: '120MW',
    country: '中国',
    province: '广东省',
    owner: '南方电网',
    epc: '中国电建',
    operation: '隆基绿能',
    image: 'https://via.placeholder.com/400x200?text=Guangzhou+Station'
  },
  {
    id: 5,
    name: '深圳科技园光伏站',
    longitude: 114.0579,
    latitude: 22.5431,
    cameraHeight: 1000,
    robotCount: 10,
    robotTypes: ['AGV'],
    description: '高新技术园区配套光伏电站',
    capacity: '60MW',
    country: '中国',
    province: '广东省',
    owner: '华为数字能源',
    epc: '比亚迪',
    operation: '特变电工',
    image: 'https://via.placeholder.com/400x200?text=Shenzhen+Station'
  },
  {
    id: 6,
    name: '成都西部电站',
    longitude: 104.0668,
    latitude: 30.5728,
    cameraHeight: 1000,
    robotCount: 18,
    robotTypes: ['干挂式', '分布式', 'AGV'],
    description: '西部大型光伏基地，全套智能运维',
    capacity: '150MW',
    country: '中国',
    province: '四川省',
    owner: '国家能源集团',
    epc: '中国电建',
    operation: '协鑫集团',
    image: 'https://via.placeholder.com/400x200?text=Chengdu+Station'
  }
])

// 筛选后的电站列表
const filteredStations = ref([])

// 筛选函数
const filterStations = () => {
  filteredStations.value = stationData.value.filter(station => {
    const robotTypeMatch = selectedRobotType.value === '全部' || 
                          station.robotTypes.includes(selectedRobotType.value)
    const countryMatch = selectedCountry.value === '全部' || 
                        station.country === selectedCountry.value
    return robotTypeMatch && countryMatch
  })
}

// 初始化筛选列表
filterStations()

// 创建 SVG 图标（Data URI 格式）
const createSVGIcon = (color = '#FF4444') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
      <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

// 绘制标记点的函数（同时添加小红点和SVG图标）
const addLocationMarker = (location) => {
  const entity = viewer.entities.add({
    name: location.name,
    position: Cesium.Cartesian3.fromDegrees(location.longitude, location.latitude),
    // 小红点（远距离显示）
    point: {
      pixelSize: 7,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      // outlineWidth: 2,
      show: true, // 默认显示小红点
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    // SVG 图标（近距离显示）
    billboard: {
      image: createSVGIcon('#FF4444'),
      width: 40,
      height: 40,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      show: false // 默认隐藏 SVG 图标
    },
    // 文字标签（近距离显示）
    // label: {
    //   text: `${location.name}\n经度: ${location.longitude}°\n纬度: ${location.latitude}°`,
    //   font: '16px sans-serif',
    //   fillColor: Cesium.Color.WHITE,
    //   style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    //   outlineWidth: 2,
    //   outlineColor: Cesium.Color.BLACK,
    //   verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    //   pixelOffset: new Cesium.Cartesian2(0, -50),
    //   show: false // 默认隐藏标签
    // }
  })
  return entity
}

// 更新标记显示状态（根据相机高度）
const updateMarkersDisplay = () => {
  const cameraHeight = viewer.camera.positionCartographic.height
  const isZoomedOut = cameraHeight > ZOOM_THRESHOLD

  viewer.entities.values.forEach(entity => {
    if (entity.point && entity.billboard) {
      // 根据缩放级别切换显示
      entity.point.show = isZoomedOut  // 远距离：显示小红点
      entity.billboard.show = !isZoomedOut  // 近距离：显示 SVG 图标
      // 如果有标签，也切换显示
      if (entity.label) {
        entity.label.show = !isZoomedOut
      }
    }
  })
}

// 点击列表项，相机飞到对应位置
const flyToLocation = (location) => {
  // 显示详情面板
  showDetailPanel(location)
  
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      location.longitude, 
      location.latitude, 
      location.cameraHeight
    ),
    duration: 2,  // 飞行时间2秒
    complete: () => {
      // 飞行完成后更新标记显示
      updateMarkersDisplay()
      console.log(`已到达：${location.name}`)
    }
  })
  console.log(`飞往：${location.name}`)
}

// 显示详情面板
const showDetailPanel = (location) => {
  selectedLocation.value = location
  detailPanelVisible.value = true
}

// 关闭详情面板
const closeDetailPanel = () => {
  detailPanelVisible.value = false
}

onMounted(() => {
  // 获取 Cesium Ion 默认的底图列表
  const imageryViewModels = Cesium.createDefaultImageryProviderViewModels()
  
  // 查找 "Bing Maps Aerial with Labels" 或包含 "Labels" 的卫星图层
  const aerialWithLabels = imageryViewModels.find(model => 
    model.name.includes('Satellite with Labels')
  )
  
  // 创建 Cesium Viewer
  viewer = new Cesium.Viewer(cesiumContainer.value, {
    animation: false,           // 隐藏动画控件
    timeline: false,            // 隐藏时间轴
    baseLayerPicker: true,      // 显示底图选择器
    fullscreenButton: true,    // 隐藏全屏按钮
    // geocoder: false,            // 隐藏地名查找控件
    homeButton: false,          // 隐藏Home按钮
    // sceneModePicker: false,     // 隐藏场景模式选择器（2D/3D切换）
    navigationHelpButton: false,// 隐藏导航帮助按钮
    infoBox: false,             // 隐藏信息框
    selectionIndicator: false,  // 隐藏选择指示器
    selectedImageryProviderViewModel: aerialWithLabels || imageryViewModels[0]  // 默认选择带标签的卫星图
  })
  
  console.log('Cesium 地球已加载')
  console.log('可用的图层列表：', imageryViewModels.map(m => m.name))
  
  // 设置初始相机位置 - 对准中国，保持较大缩放比例
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(104.195397, 35.86166, 11100000),  // 中国中心位置，高度5000km
    orientation: {
      heading: Cesium.Math.toRadians(0),  // 航向角
      pitch: Cesium.Math.toRadians(-90),  // 俯仰角（-90度俯视）
      roll: 0  // 翻滚角
    }
  })
  
  // 读取电站数据列表，绘制所有标记点
  stationData.value.forEach(station => {
    addLocationMarker(station)
  })
  
  console.log(`已添加 ${stationData.value.length} 个电站标记点`)
  
  // 创建悬浮提示标签
  hoverLabel = viewer.entities.add({
    label: {
      show: false,
      showBackground: true,
      font: '14px sans-serif',
      backgroundColor: new Cesium.Color(0, 0, 0, 0.8),
      fillColor: Cesium.Color.WHITE,
      pixelOffset: new Cesium.Cartesian2(0, -40),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  })
  
  // 监听相机移动事件，动态切换标记显示
  viewer.camera.moveEnd.addEventListener(() => {
    updateMarkersDisplay()
  })
  
  // 事件处理器
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  
  // 鼠标移动事件 - 显示悬浮名称
  handler.setInputAction((movement) => {
    const pickedObject = viewer.scene.pick(movement.endPosition)
    if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
      const entity = pickedObject.id
      if (entity !== hoverLabel && entity.position) {
        const stationInfo = stationData.value.find(s => s.name === entity.name)
        if (stationInfo) {
          // 显示悬浮标签
          hoverLabel.position = entity.position.getValue(Cesium.JulianDate.now())
          hoverLabel.label.text = stationInfo.name
          hoverLabel.label.show = true
          viewer.scene.canvas.style.cursor = 'pointer'
        }
      }
    } else {
      // 隐藏悬浮标签
      hoverLabel.label.show = false
      viewer.scene.canvas.style.cursor = 'default'
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  
  // 双击事件 - 飞到该位置并显示详情面板
  handler.setInputAction((click) => {
    const pickedObject = viewer.scene.pick(click.position)
    if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
      const entity = pickedObject.id
      if (entity !== hoverLabel && entity.position) {
        // 获取实体对应的电站数据
        const stationInfo = stationData.value.find(s => s.name === entity.name)
        if (stationInfo) {
          // 飞到该位置（会自动显示详情面板）
          flyToLocation(stationInfo)
        } else {
          // 如果找不到对应数据，使用默认高度
          const position = entity.position.getValue(Cesium.JulianDate.now())
          const cartographic = Cesium.Cartographic.fromCartesian(position)
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
              Cesium.Math.toDegrees(cartographic.longitude),
              Cesium.Math.toDegrees(cartographic.latitude),
              50000  // 默认飞到 50km 高度
            ),
            duration: 2,
            complete: () => {
              updateMarkersDisplay()
            }
          })
        }
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
  
  // 初始化时更新一次显示状态
  updateMarkersDisplay()
  
  console.log(`缩放阈值：${ZOOM_THRESHOLD / 1000} 千米`)
  console.log('双击图标可自动飞到该位置')
})
</script>

<template>
  <div class="big-screen-wrapper">
    <div ref="cesiumContainer" class="cesium-container"></div>
    
    <!-- 左侧筛选和电站列表 -->
    <div class="station-panel">
      <!-- 筛选区域 -->
      <div class="filter-section">
        <div class="filter-group">
          <label class="filter-label">机器人类型</label>
          <select v-model="selectedRobotType" @change="filterStations" class="filter-select">
            <option v-for="type in robotTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">国家</label>
          <select v-model="selectedCountry" @change="filterStations" class="filter-select">
            <option v-for="country in countries" :key="country" :value="country">{{ country }}</option>
          </select>
        </div>
      </div>
      
      <!-- 电站列表 -->
      <div class="list-header">电站列表 ({{ filteredStations.length }})</div>
      <div class="station-list">
        <div 
          v-for="station in filteredStations" 
          :key="station.id"
          class="station-item"
          @click="flyToLocation(station)"
        >
          <div class="station-name">{{ station.name }}</div>
          <div class="station-info">
            <span class="info-tag">🤖 {{ station.robotCount }}台</span>
            <span class="info-tag">⚡ {{ station.capacity }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 右侧电站详情面板 -->
    <transition name="slide-fade">
      <div v-if="detailPanelVisible && selectedLocation" class="detail-panel">
        <div class="detail-header">
          <h2 class="detail-title">{{ selectedLocation.name }}</h2>
          <button class="close-btn" @click="closeDetailPanel">✕</button>
        </div>
        <div class="detail-content">
          <!-- 电站图片 -->
          <div class="station-image">
            <img :src="selectedLocation.image" :alt="selectedLocation.name">
          </div>
          
          <!-- 基本信息 -->
          <div class="info-section">
            <div class="detail-item">
              <div class="detail-label">电站名称</div>
              <div class="detail-value">{{ selectedLocation.name }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">经纬度</div>
              <div class="detail-value">{{ selectedLocation.longitude }}°, {{ selectedLocation.latitude }}°</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">机器人数量</div>
              <div class="detail-value">{{ selectedLocation.robotCount }} 台</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">机器人类型</div>
              <div class="detail-value">
                <span v-for="(type, index) in selectedLocation.robotTypes" :key="index" class="robot-type-tag">
                  {{ type }}
                </span>
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">电站容量</div>
              <div class="detail-value">{{ selectedLocation.capacity }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">国家/省份</div>
              <div class="detail-value">{{ selectedLocation.country }} / {{ selectedLocation.province }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">业主</div>
              <div class="detail-value">{{ selectedLocation.owner }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">EPC</div>
              <div class="detail-value">{{ selectedLocation.epc }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">运维</div>
              <div class="detail-value">{{ selectedLocation.operation }}</div>
            </div>
            <div class="detail-item full-width">
              <div class="detail-label">电站描述</div>
              <div class="detail-value">{{ selectedLocation.description }}</div>
            </div>
          </div>
        </div>
        <div class="detail-footer">
          <button class="action-btn" @click="flyToLocation(selectedLocation)">
            📍 重新定位
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* 隐藏 Cesium 底部版权信息 - 使用深度选择器 */
:deep(.cesium-widget-credits) {
  display: none !important;
}

.big-screen-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.cesium-container {
  width: 100%;
  height: 100%;
}

/* 右侧详情面板 */
.detail-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 380px;
  max-height: calc(100vh - 40px);
  background: rgba(0, 0, 0, 0.75);
  border-radius: 8px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

/* 电站图片 */
.station-image {
  width: 100%;
  height: 180px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
}

.station-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 信息区域 */
.info-section {
  padding: 0;
}

/* 机器人类型标签 */
.robot-type-tag {
  display: inline-block;
  padding: 4px 10px;
  margin-right: 6px;
  margin-top: 4px;
  background: rgba(255, 107, 53, 0.3);
  border: 1px solid rgba(255, 107, 53, 0.5);
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
}

/* 全宽项目（如描述） */
.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item.full-width .detail-value {
  line-height: 1.6;
}

.detail-header {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.detail-title {
  margin: 0;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.close-btn {
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s ease;
  padding: 0;
}

.close-btn:hover {
  color: #fff;
}

.detail-content {
  padding: 10px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}

.detail-content::-webkit-scrollbar {
  width: 6px;
}

.detail-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.detail-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.detail-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.detail-item {
  margin-bottom: 8px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.detail-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 4px;
}

.detail-value {
  font-size: 14px;
  color: #fff;
  font-weight: 500;
}

.detail-footer {
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.action-btn {
  width: 100%;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.action-btn:active {
  background: rgba(255, 255, 255, 0.1);
}

/* 滑动渐变动画（从右侧） */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* 左侧电站面板 */
.station-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 320px;
  max-height: calc(100vh - 40px);
  background: rgba(0, 0, 0, 0.75);
  border-radius: 8px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  flex-direction: column;
}

/* 筛选区域 */
.filter-section {
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-group {
  margin-bottom: 12px;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  margin-bottom: 6px;
}

.filter-select {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-select:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.filter-select option {
  background: #1a1a1a;
  color: #fff;
}

/* 列表标题 */
.list-header {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

/* 电站列表 */
.station-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.station-list::-webkit-scrollbar {
  width: 6px;
}

.station-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.station-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.station-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.station-item {
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.station-item:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateX(4px);
}

.station-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.station-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.info-tag {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
}
</style>

