<script setup>
import { onMounted, ref } from 'vue'
import * as Cesium from 'cesium'

const cesiumContainer = ref(null)
let viewer = null
const ZOOM_THRESHOLD = 100000 // 缩放阈值（米），相机高度大于此值时显示小红点

// 数据列表：地名、经纬度、相机高度
const locationData = ref([
  {
    id: 1,
    name: '安徽合肥',
    longitude: 117.137899,
    latitude: 31.830709,
    cameraHeight: 500  // 相机高度（米）
  },
  {
    id: 2,
    name: '北京',
    longitude: 116.4074,
    latitude: 39.9042,
    cameraHeight: 800000
  },
  {
    id: 3,
    name: '上海',
    longitude: 121.4737,
    latitude: 31.2304,
    cameraHeight: 600000
  },
  {
    id: 4,
    name: '广州',
    longitude: 113.2644,
    latitude: 23.1291,
    cameraHeight: 600000
  },
  {
    id: 5,
    name: '深圳',
    longitude: 114.0579,
    latitude: 22.5431,
    cameraHeight: 400000
  },
  {
    id: 6,
    name: '成都',
    longitude: 104.0668,
    latitude: 30.5728,
    cameraHeight: 500000
  }
])

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
      pixelSize: 10,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
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
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      location.longitude, 
      location.latitude, 
      location.cameraHeight
    ),
    duration: 2  // 飞行时间2秒
  })
  console.log(`飞往：${location.name}`)
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
    fullscreenButton: false,    // 隐藏全屏按钮
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
  
  // 读取数据列表，绘制所有标记点
  locationData.value.forEach(location => {
    addLocationMarker(location)
  })
  
  console.log(`已添加 ${locationData.value.length} 个标记点`)
  
  // 监听相机移动事件，动态切换标记显示
  viewer.camera.moveEnd.addEventListener(() => {
    updateMarkersDisplay()
  })
  
  // 初始化时更新一次显示状态
  updateMarkersDisplay()
  
  console.log(`缩放阈值：${ZOOM_THRESHOLD / 1000} 千米`)
})
</script>

<template>
  <div class="big-screen-wrapper">
    <div ref="cesiumContainer" class="cesium-container"></div>
    
    <!-- 右侧地名列表 -->
    <!-- <div class="location-list">
      <div class="list-header">地点导航</div>
      <div class="list-content">
        <div 
          v-for="location in locationData" 
          :key="location.id"
          class="location-item"
          @click="flyToLocation(location)"
        >
          <div class="location-name">{{ location.name }}</div>
          <div class="location-coords">
            <span>经度: {{ location.longitude }}°</span>
            <span>纬度: {{ location.latitude }}°</span>
          </div>
        </div>
      </div>
    </div> -->
  </div>
</template>

<style scoped>
.big-screen-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.cesium-container {
  width: 100%;
  height: 100%;
}

/* 右侧地名列表 */
.location-list {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 280px;
  max-height: calc(100vh - 40px);
  background: rgba(0, 0, 0, 0.75);
  border-radius: 8px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.list-header {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.list-content {
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding: 10px;
}

/* 滚动条样式 */
.list-content::-webkit-scrollbar {
  width: 6px;
}

.list-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.list-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.list-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.location-item {
  padding: 14px 16px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.location-item:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateX(-4px);
}

.location-name {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 6px;
}

.location-coords {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}
</style>

