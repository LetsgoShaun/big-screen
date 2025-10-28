<script setup>
import { onMounted, ref } from 'vue'
import * as Cesium from 'cesium'
import { getStationList, getCountries, getProvinces, getStationStat, getRobotStat, createUrl } from '@/api/station.ts'
import { RobotType } from '@/types/station.ts'

const cesiumContainer = ref(null)
let viewer = null
const ZOOM_THRESHOLD = 50000 // 缩放阈值（米），相机高度大于此值时显示小红点

// 密码验证相关
const isAuthenticated = ref(false)
const passwordInput = ref('')
const passwordError = ref('')
// 存储密码的哈希值，而不是明文密码
// 这是 "" 的哈希值
// 要生成新密码的哈希值，在浏览器控制台运行：
// function hashPassword(password) { let hash = 0; for (let i = 0; i < password.length; i++) { const char = password.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash = hash & hash; } return Math.abs(hash).toString(16).padStart(8, '0'); }
// console.log(hashPassword('你的密码'))
const PASSWORD_HASH = '39c43b7d' // 正确哈希值

// 自转控制
let isAutoRotating = false
let rotationSpeed = 0.0003    // 自转速度（弧度/帧）
let rotationListener = null   // 自转监听器引用

// 右侧详情面板相关
const detailPanelVisible = ref(false)
const selectedLocation = ref(null)

// 机器人统计数据
const robotStats = ref({
  normal: 0,
  alarm: 0,
  fault: 0,
  active: 0,
  inactive: 0
})

// 电站图片URL
const stationImageUrl = ref('')

// 左侧面板状态管理
const leftPanelMode = ref('list') // 'list' 显示筛选列表，'detail' 显示详情内容

// 悬浮提示标签
let hoverLabel = null

// 加载状态
const loading = ref(false)
const loadError = ref(null)

// 筛选条件
const selectedRobotType = ref('全部')
const selectedCountry = ref('全部')
const selectedProvince = ref('全部')

// 机器人类型列表
const robotTypes = ['全部', '干挂式', '分布式', 'AGV']

// 国家列表（从接口获取）
const countries = ref([])

// 省份列表（从接口获取）
const provinces = ref(['全部'])

// 可搜索下拉框状态
const robotTypeDropdownOpen = ref(false)
const countryDropdownOpen = ref(false)
const provinceDropdownOpen = ref(false)
const countrySearchText = ref('')
const provinceSearchText = ref('')

// 过滤后的选项
const filteredCountries = ref([])
const filteredProvinces = ref(['全部'])

// 电站统计数据
const stationStats = ref({
  stationNum: 0,
  robotNum: 0,
  stationCapacity: 0
})

// 切换下拉框（互斥展开）
const toggleRobotTypeDropdown = () => {
  if (!robotTypeDropdownOpen.value) {
    countryDropdownOpen.value = false
    provinceDropdownOpen.value = false
    countrySearchText.value = ''
    provinceSearchText.value = ''
    filteredCountries.value = [...countries.value]
    filteredProvinces.value = [...provinces.value]
  }
  robotTypeDropdownOpen.value = !robotTypeDropdownOpen.value
}

const toggleCountryDropdown = () => {
  if (!countryDropdownOpen.value) {
    robotTypeDropdownOpen.value = false
    provinceDropdownOpen.value = false
    provinceSearchText.value = ''
    filteredProvinces.value = [...provinces.value]
  }
  countryDropdownOpen.value = !countryDropdownOpen.value
}

const toggleProvinceDropdown = () => {
  if (!provinceDropdownOpen.value) {
    robotTypeDropdownOpen.value = false
    countryDropdownOpen.value = false
    countrySearchText.value = ''
    filteredCountries.value = [...countries.value]
  }
  provinceDropdownOpen.value = !provinceDropdownOpen.value
}

// 搜索过滤函数
const filterCountryOptions = () => {
  const searchText = countrySearchText.value.toLowerCase()
  filteredCountries.value = countries.value.filter(country => {
    // 如果是字符串（"全部"），按原逻辑处理
    if (typeof country === 'string') {
      return country.toLowerCase().includes(searchText)
    }
    // 如果是对象，按name字段过滤
    return country.name.toLowerCase().includes(searchText)
  })
}

const filterProvinceOptions = () => {
  const searchText = provinceSearchText.value.toLowerCase()
  filteredProvinces.value = provinces.value.filter(province => 
    province.toLowerCase().includes(searchText)
  )
}

// 获取电站机器人图片
const getStationRobotImage = (station) => {
  // 获取电站的主要机器人类型
  const mainRobotType = station.robotTypes && station.robotTypes[0] ? station.robotTypes[0] : '干挂式'
  
  // 根据机器人类型返回对应图片
  const imageMap = {
    '干挂式': '/media/PVRailed1200.png',
    '分布式': '/media/trackless.png',
    'AGV': '/media/AGV.png'
  }
  
  return imageMap[mainRobotType] || '/media/all.png'
}

// 根据选择的机器人类型获取图片
const getSelectedRobotTypeImage = () => {
  const imageMap = {
    '全部': '/media/all.png',
    '干挂式': '/media/PVRailed1200.png',
    '分布式': '/media/trackless.png',
    'AGV': '/media/AGV.png'
  }
  
  return imageMap[selectedRobotType.value] || '/media/all.png'
}

// 格式化容量显示
const formatCapacity = (capacity) => {
  if (capacity >= 1000) {
    return {
      value: (capacity / 1000).toFixed(1),
      unit: 'GW'
    }
  } else {
    return {
      value: capacity.toString(),
      unit: 'MW'
    }
  }
}

// 获取机器人类型图片
const getRobotTypeImage = (type) => {
  const imageMap = {
    '全部': '/media/all.png',
    '干挂式': '/media/PVRailed1200.png',
    '分布式': '/media/trackless.png', 
    'AGV': '/media/AGV.png',
    // '组件安装': '/media/PVRailed1200.png'
  }
  return imageMap[type] || '/media/PVRailed1200.png'
}

// 选择选项
const selectRobotType = (type) => {
  selectedRobotType.value = type
  // 重新获取电站数据和统计数据
  fetchStationData()
  fetchStationStats()
}

const selectCountry = (country) => {
  // 如果传入的是字符串（"全部"），保持原有逻辑
  if (typeof country === 'string') {
    selectedCountry.value = country
    countryDropdownOpen.value = false
    countrySearchText.value = ''
    filteredCountries.value = [...countries.value]
    
    // 如果选择的不是"中国"，重置省份选择并隐藏省份下拉框
    if (country !== '中国') {
      selectedProvince.value = '全部'
      provinceDropdownOpen.value = false
      provinceSearchText.value = ''
      filteredProvinces.value = [...provinces.value]
    }
    
    // 重新获取电站数据和统计数据
    fetchStationData()
    fetchStationStats()
  } else {
    // 如果传入的是国家对象，进行视角转换
    selectedCountry.value = country.name
    countryDropdownOpen.value = false
    countrySearchText.value = ''
    filteredCountries.value = [...countries.value]
    
    // 停止自转
    stopAutoRotation()
    
    // 视角转换到该国家
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        country.lon, 
        country.lat, 
        country.height
      ),
      duration: 2,  // 飞行时间2秒
      complete: () => {
        console.log(`已到达：${country.name}`)
      }
    })
    
    // 如果选择的不是"中国"，重置省份选择并隐藏省份下拉框
    if (country.name !== '中国') {
      selectedProvince.value = '全部'
      provinceDropdownOpen.value = false
      provinceSearchText.value = ''
      filteredProvinces.value = [...provinces.value]
    }
    
    // 重新获取电站数据和统计数据
    fetchStationData()
    fetchStationStats()
  }
}

const selectProvince = (province) => {
  selectedProvince.value = province
  provinceDropdownOpen.value = false
  provinceSearchText.value = ''
  filteredProvinces.value = [...provinces.value]
  // 重新获取电站数据和统计数据
  fetchStationData()
  fetchStationStats()
}

// 点击外部关闭下拉框
const closeDropdowns = () => {
  robotTypeDropdownOpen.value = false
  countryDropdownOpen.value = false
  provinceDropdownOpen.value = false
  countrySearchText.value = ''
  provinceSearchText.value = ''
  filteredCountries.value = [...countries.value]
  filteredProvinces.value = [...provinces.value]
}

// 简单的哈希函数（兼容所有浏览器和 HTTP 环境）
const hashPassword = (password) => {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  // 转换为十六进制字符串
  return Math.abs(hash).toString(16).padStart(8, '0')
}

// 密码验证
const checkPassword = () => {
  const inputHash = hashPassword(passwordInput.value)
  if (inputHash === PASSWORD_HASH) {
    isAuthenticated.value = true
    passwordError.value = ''
    // 验证成功后初始化地球
    initializeCesium()
  } else {
    passwordError.value = '密码错误，请重试'
    passwordInput.value = ''
  }
}

// 处理回车键
const handlePasswordKeydown = (event) => {
  if (event.key === 'Enter') {
    checkPassword()
  }
}

// 电站数据列表
const stationData = ref([])

// 机器人类型映射（后端枚举转前端显示文本）
const robotTypeMap = {
  [RobotType.ROBOT]: '干挂式',
  [RobotType.TRACKLESS]: '分布式',
  [RobotType.AGV]: 'AGV',
}

// 机器人类型映射（前端显示文本转后端枚举）
const robotTypeReverseMap = {
  '干挂式': RobotType.ROBOT,
  '分布式': RobotType.TRACKLESS,
  'AGV': RobotType.AGV,
  // '组件安装': 'COMPONENT_INSTALL' // 新增组件安装类型
}

// 从后端获取筛选选项数据
const fetchFilterOptions = async () => {
  try {
    // 获取国家列表
    const countryList = await getCountries()
    countries.value = ['全部', ...countryList]
    filteredCountries.value = [...countries.value]
    
    // 获取省份列表
    const provinceList = await getProvinces()
    provinces.value = ['全部', ...provinceList]
    filteredProvinces.value = [...provinces.value]
    
    console.log('筛选选项加载成功 - 国家:', countryList.length, '个, 省份:', provinceList.length, '个')
  } catch (error) {
    console.error('获取筛选选项失败:', error)
  }
}

// 从后端获取电站统计数据
const fetchStationStats = async () => {
  loading.value = true
  loadError.value = null
  
  try {
    // 构建查询参数
    const queryObj = {}
    
    // 机器人类型
    if (selectedRobotType.value !== '全部') {
      queryObj.robotType = robotTypeReverseMap[selectedRobotType.value]
    }
    
    // 国家
    if (selectedCountry.value !== '全部') {
      queryObj.country = selectedCountry.value
    }
    
    // 省份
    if (selectedProvince.value !== '全部') {
      queryObj.province = selectedProvince.value
    }
    
    // 调用统计接口
    const stats = await getStationStat(queryObj)
    stationStats.value = stats
    
    console.log('电站统计数据:', stats)
  } catch (error) {
    console.error('获取电站统计数据失败:', error)
    loadError.value = '加载电站数据失败，请稍后重试'
    stationStats.value = {
      stationNum: 0,
      robotNum: 0,
      stationCapacity: 0
    }
  } finally {
    loading.value = false
  }
}

// 从后端获取电站列表数据（用于地图标记）
const fetchStationData = async () => {
  loading.value = true
  loadError.value = null
  
  try {
    // 构建查询参数
    const queryObj = {}
    
    // 机器人类型
    if (selectedRobotType.value !== '全部') {
      queryObj.robotType = robotTypeReverseMap[selectedRobotType.value]
    }
    
    // 国家
    if (selectedCountry.value !== '全部') {
      queryObj.country = selectedCountry.value
    }
    
    // 省份
    if (selectedProvince.value !== '全部') {
      queryObj.province = selectedProvince.value
    }
    
    // 调用接口获取数据
    const response = await getStationList(queryObj, { page: 0, size: 10000 })
    
    // 数据转换：将后端数据格式转换为前端需要的格式
    stationData.value = response.content.map(station => {
      const lon = station.lon != null ? parseFloat(station.lon) : null
      const lat = station.lat != null ? parseFloat(station.lat) : null
      
      return {
        id: station.id,
        name: station.name,
        longitude: lon, // 可能为 null
        latitude: lat, // 可能为 null
        cameraHeight: station.height || 1000, // 使用接口返回的高度，默认1000
        robotCount: station.robotNum || 0,
        robotTypes: [robotTypeMap[station.robotType] || station.robotType || '未知'], // 转换为数组
        description: station.description || '暂无描述',
        capacity: station.capacity ? `${station.capacity}MW` : '未知',
        country: station.country || '未知',
        province: station.province || '未知',
        owner: station.owner || '未知',
        epc: station.epc || '未知',
        operation: station.operation || '未知',
        image: station.image || 'https://via.placeholder.com/400x200?text=Station'
      }
    })
    
    console.log('电站数据加载成功:', stationData.value.length, '个电站')
    
    // 如果 Cesium 已初始化，更新地图标记
    if (viewer) {
      addAllMarkers()
    }
  } catch (error) {
    console.error('获取电站列表失败:', error)
    loadError.value = '加载电站数据失败，请稍后重试'
    // 使用空数据
    stationData.value = []
  } finally {
    loading.value = false
  }
}

// 创建 SVG 图标（Data URI 格式）
const createSVGIcon = (color = '#FF4444') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
      <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

// 绘制标记点的函数（根据机器人数量决定显示方式）
const addLocationMarker = (location) => {
  const entity = viewer.entities.add({
    name: location.name,
    position: Cesium.Cartesian3.fromDegrees(location.longitude, location.latitude),
    // 小红点（机器人数量小于1000时显示）
    point: {
      pixelSize: 7,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      show: location.robotCount < 1000, // 小于1000台时显示小红点
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    // 机器人图片（机器人数量大于等于1000时显示）
    billboard: {
      image: getStationRobotImage(location),
      width: 55,
      height: 55,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      show: location.robotCount >= 1000 // 大于等于1000台时显示机器人图片
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

// 批量添加所有标记点
const addAllMarkers = () => {
  // 清除已有的标记点（如果有）
  viewer.entities.removeAll()
  
  // 重新创建悬浮提示标签
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
  
  // 添加所有电站标记点（只添加有效经纬度的）
  let validCount = 0
  let invalidCount = 0
  
  stationData.value.forEach(station => {
    // 检查经纬度是否有效
    if (station.longitude != null && station.latitude != null && 
        !isNaN(station.longitude) && !isNaN(station.latitude)) {
      addLocationMarker(station)
      validCount++
    } else {
      invalidCount++
      console.warn(`电站 "${station.name}" 经纬度无效，跳过地图标记`)
    }
  })
  
  console.log(`已添加 ${validCount} 个电站标记点，跳过 ${invalidCount} 个无效经纬度的电站`)
  
  // 更新标记显示状态
  // updateMarkersDisplay()
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
  // 停止自转
  stopAutoRotation()
  
  // 显示详情面板
  showDetailPanel(location)
  
  // 检查经纬度是否有效
  if (location.longitude == null || location.latitude == null || 
      isNaN(location.longitude) || isNaN(location.latitude)) {
    console.warn(`电站 "${location.name}" 没有有效的经纬度，无法定位`)
    return
  }
  
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      location.longitude, 
      location.latitude, 
      location.cameraHeight
    ),
    duration: 2,  // 飞行时间2秒
    complete: () => {
      // 飞行完成后更新标记显示
      // updateMarkersDisplay()
      console.log(`已到达：${location.name}`)
    }
  })
  console.log(`飞往：${location.name}`)
}

// 显示详情面板
const showDetailPanel = async (location) => {
  selectedLocation.value = location
  detailPanelVisible.value = true
  
  // 并行请求机器人统计数据和图片URL
  try {
    const [robotStatData, imageUrl] = await Promise.all([
      getRobotStat(location.id),
      location.image ? createUrl(location.image) : Promise.resolve('')
    ])
    
    robotStats.value = robotStatData
    stationImageUrl.value = imageUrl
  } catch (error) {
    console.error('获取电站详情数据失败:', error)
    // 重置为默认值
    robotStats.value = {
      normal: 0,
      alarm: 0,
      fault: 0,
      active: 0,
      inactive: 0
    }
    stationImageUrl.value = ''
  }
}

// 关闭详情面板
const closeDetailPanel = () => {
  detailPanelVisible.value = false
}

// 启动自转
const startAutoRotation = () => {
  if (isAutoRotating) return
  
  isAutoRotating = true
  rotationListener = viewer.clock.onTick.addEventListener(() => {
    if (isAutoRotating) {
      // 沿赤道方向移动相机，实现地球自转效果
      const camera = viewer.camera
      const position = camera.positionCartographic
      
      // 更新经度（向东移动）
      const newLongitude = position.longitude + rotationSpeed
      
      // 保持相机在当前高度和纬度，只改变经度
      // 保持用户当前的视角角度，不强制锁定
      camera.setView({
        destination: Cesium.Cartesian3.fromRadians(
          newLongitude,
          position.latitude,
          position.height
        ),
        orientation: {
          heading: camera.heading,
          pitch: camera.pitch,
          roll: camera.roll
        }
      })
    }
  })
  console.log('🌍 地球自转已启动')
}

// 停止自转
const stopAutoRotation = () => {
  if (!isAutoRotating) return
  
  isAutoRotating = false
  if (rotationListener) {
    rotationListener()  // 移除监听器
    rotationListener = null
  }
  console.log('⏸️ 地球自转已停止')
}

// 重置相机到初始位置
const resetCamera = () => {
  if (viewer) {
    // 使用 setView 而不是 flyTo，和初始化时完全一样
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(104.195397, 35.86166, 11100000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      }
    })
    // updateMarkersDisplay()
    // 延迟启动自转，和初始化时一样
    setTimeout(() => {
      startAutoRotation()
    }, 500)  // 延迟0.5秒启动，让相机状态稳定
    console.log('相机已重置到初始位置')
  }
}

// Cesium 初始化函数
const initializeCesium = () => {
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
    baseLayerPicker: true,      // 显示底图选择器（用CSS隐藏）
    fullscreenButton: true,    // 显示全屏按钮
    geocoder: true,            // 隐藏地名查找控件
    homeButton: false,          // 隐藏Home按钮
    sceneModePicker: false,     // 隐藏场景模式选择器（2D/3D切换）
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
  
  // 初始化完成后，加载筛选选项和电站数据
  fetchFilterOptions()
  fetchStationData()
  fetchStationStats()
  
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
  // viewer.camera.moveEnd.addEventListener(() => {
  //   updateMarkersDisplay()
  // })
  
  // 禁用 Cesium 默认的双击聚焦行为
  viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
  
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
            // complete: () => {
            //   updateMarkersDisplay()
            // }
          })
        }
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
  
  // 初始化时更新一次显示状态
  // updateMarkersDisplay()
  
  // ========== 用户交互监听 - 任何操作都停止自转 ==========
  
  // // 监听相机移动开始事件
  // viewer.camera.moveStart.addEventListener(() => {
  //   stopAutoRotation()
  // })
  
  // 监听鼠标按下事件（拖动地球）
  const screenHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  screenHandler.setInputAction(() => {
    stopAutoRotation()
  }, Cesium.ScreenSpaceEventType.LEFT_DOWN)
  
  // 监听鼠标滚轮事件（缩放）
  screenHandler.setInputAction(() => {
    stopAutoRotation()
  }, Cesium.ScreenSpaceEventType.WHEEL)
  
  // 监听右键拖动事件（旋转视角）
  screenHandler.setInputAction(() => {
    stopAutoRotation()
  }, Cesium.ScreenSpaceEventType.RIGHT_DOWN)
  
  // 监听中键拖动事件（平移）
  screenHandler.setInputAction(() => {
    stopAutoRotation()
  }, Cesium.ScreenSpaceEventType.MIDDLE_DOWN)
  
  // 初始化完成后启动自转
  setTimeout(() => {
    startAutoRotation()
  }, 500)  // 延迟0.5秒启动，让初始动画完成
  
  // 全局点击事件监听 - 点击外部关闭下拉框
  document.addEventListener('click', closeDropdowns)
  
  console.log(`缩放阈值：${ZOOM_THRESHOLD / 1000} 千米`)
  console.log('双击图标可自动飞到该位置')
  console.log('💡 提示：初始化和重置后会自动转动，任何操作后停止')
}

onMounted(() => {
  // 页面加载时不立即初始化 Cesium，等待密码验证
  // 如果需要开发时跳过密码，可以取消注释下面这行
  isAuthenticated.value = true
  initializeCesium()
})
</script>

<template>
  <div class="big-screen-wrapper">
    <div ref="cesiumContainer" class="cesium-container"></div>
    
    <!-- 密码验证蒙层 -->
    <transition name="fade">
      <div v-if="!isAuthenticated" class="auth-overlay">
        <div class="auth-box">
          <div class="auth-header">
            <div class="auth-icon">🔒</div>
            <h2 class="auth-title">访问验证</h2>
            <p class="auth-subtitle">请输入密码以访问大屏</p>
          </div>
          <div class="auth-content">
            <input 
              v-model="passwordInput"
              type="password"
              class="auth-input"
              placeholder="请输入密码"
              @keydown="handlePasswordKeydown"
              autofocus
            />
            <transition name="shake">
              <div v-if="passwordError" class="auth-error">{{ passwordError }}</div>
            </transition>
            <button class="auth-button" @click="checkPassword">
              确认
            </button>
          </div>
        </div>
      </div>
    </transition>
    
    <!-- 重置视角按钮 -->
    <!-- <button class="cesium-reset-button cesium-button cesium-toolbar-button" @click="resetCamera" title="重置视角">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M3 21v-5h5"/>
      </svg>
    </button> -->
    
    <!-- 顶部统计面板 -->
    <div v-if="isAuthenticated" class="stats-panel">
      <div class="stats-item">
        <div class="stats-icon">
          <img src="/media/lightning-icon.svg" alt="电站" />
        </div>
        <div class="stats-content">
          <div class="stats-label">电站数量</div>
          <div class="stats-value">{{ stationStats.stationNum }}</div>
        </div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-item">
        <div class="stats-image" style="width: 50px;">
          <img :src="getSelectedRobotTypeImage()" alt="机器人" />
        </div>
        <div class="stats-content">
          <div class="stats-label">机器人数量</div>
          <div class="stats-value">{{ stationStats.robotNum }}</div>
        </div>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-item">
        <div class="stats-icon">
          <img src="/media/factory-icon.svg" alt="电站容量总和" />
        </div>
        <div class="stats-content">
          <div class="stats-label">电站容量总和</div>
          <div class="stats-value">{{ formatCapacity(stationStats.stationCapacity).value }} <span class="stats-unit">{{ formatCapacity(stationStats.stationCapacity).unit }}</span></div>
        </div>
      </div>
    </div>
    
    <!-- 左侧筛选和电站列表 -->
    <div v-if="isAuthenticated" class="station-panel">
      <!-- 筛选区域 -->
      <div class="filter-section" @click.stop>
        <div class="filter-group">
          <label class="filter-label">机器人类型</label>
          <div class="robot-type-radio-group">
            <div 
              v-for="type in robotTypes" 
              :key="type"
              class="robot-type-option"
              @click="selectRobotType(type)"
            >
              <input 
                type="radio" 
                :id="`robot-type-${type}`"
                :name="'robotType'"
                :value="type"
                v-model="selectedRobotType"
                @change="selectRobotType(type)"
              />
              <img :src="getRobotTypeImage(type)" :alt="type" />
            </div>
          </div>
        </div>
        <div class="filter-group">
          <label class="filter-label">国家</label>
          <div class="custom-select" @click="toggleCountryDropdown">
            <div class="custom-select-trigger">
              <span>{{ selectedCountry }}</span>
              <span class="arrow" :class="{ 'arrow-up': countryDropdownOpen }">▼</span>
            </div>
            <transition name="dropdown">
              <div v-if="countryDropdownOpen" class="custom-options" @click.stop>
                <div class="search-box">
                  <input 
                    type="text" 
                    v-model="countrySearchText" 
                    @input="filterCountryOptions"
                    placeholder="搜索国家..."
                    class="search-input"
                    @click.stop
                  />
                </div>
                <div class="options-list">
                  <div 
                    v-for="country in filteredCountries" 
                    :key="typeof country === 'string' ? country : country.id"
                    class="custom-option"
                    :class="{ 'selected': (typeof country === 'string' ? country : country.name) === selectedCountry }"
                    @click="selectCountry(country)"
                  >
                    {{ typeof country === 'string' ? country : country.name }}
                  </div>
                  <div v-if="filteredCountries.length === 0" class="no-options">
                    无匹配选项
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
        <div v-if="selectedCountry === '中国'" class="filter-group">
          <label class="filter-label">省份</label>
          <div class="custom-select" @click="toggleProvinceDropdown">
            <div class="custom-select-trigger">
              <span>{{ selectedProvince }}</span>
              <span class="arrow" :class="{ 'arrow-up': provinceDropdownOpen }">▼</span>
            </div>
            <transition name="dropdown">
              <div v-if="provinceDropdownOpen" class="custom-options" @click.stop>
                <div class="search-box">
                  <input 
                    type="text" 
                    v-model="provinceSearchText" 
                    @input="filterProvinceOptions"
                    placeholder="搜索省份..."
                    class="search-input"
                    @click.stop
                  />
                </div>
                <div class="options-list">
                  <div 
                    v-for="province in filteredProvinces" 
                    :key="province"
                    class="custom-option"
                    :class="{ 'selected': province === selectedProvince }"
                    @click="selectProvince(province)"
                  >
                    {{ province }}
                  </div>
                  <div v-if="filteredProvinces.length === 0" class="no-options">
                    无匹配选项
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
      
      <!-- 电站列表 -->
      <div class="list-header">电站列表 ({{ stationData.length }})</div>
      <div class="station-list">
        <div 
          v-for="station in stationData" 
          :key="station.id"
          class="station-item"
          @click="flyToLocation(station)"
        >
          <div class="station-header">
            <div class="station-name">{{ station.name }}</div>
            <div class="station-location">{{ station.country }} / {{ station.province }}</div>
          </div>
          <div class="station-stats">
            <div class="stat-item">
              <div class="stat-image">
                <img :src="getStationRobotImage(station)" :alt="station.robotTypes[0]" />
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ station.robotCount }}</div>
                <div class="stat-label">台机器人</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">
                <img src="/media/factory-icon.svg" alt="电站容量总和" />
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ station.capacity.replace('MW', '') }}</div>
                <div class="stat-label">MW</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 右侧电站详情面板 -->
    <transition name="slide-fade">
      <div v-if="isAuthenticated && detailPanelVisible && selectedLocation" class="detail-panel">
        <div class="detail-header">
          <h2 class="detail-title">{{ selectedLocation.name }}</h2>
          <button class="close-btn" @click="closeDetailPanel">✕</button>
        </div>
        <div class="detail-content">
          <!-- 电站图片 -->
          <div class="station-image">
            <img v-if="stationImageUrl" :src="stationImageUrl" :alt="selectedLocation.name">
            <div v-else class="no-image">暂无图片</div>
          </div>
          
          <!-- 基本信息 -->
          <div class="info-section">
            <!-- <div class="detail-item">
              <div class="detail-label">电站名称</div>
              <div class="detail-value">{{ selectedLocation.name }}</div>
            </div> -->
            <!-- <div class="detail-item">
              <div class="detail-label">经纬度</div>
              <div class="detail-value">{{ selectedLocation.longitude }}°, {{ selectedLocation.latitude }}°</div>
            </div> -->
            <div class="detail-item">
              <div class="detail-label">机器人数量</div>
              <div class="detail-value">{{ selectedLocation.robotCount }} 台</div>
            </div>
            <!-- <div class="detail-item">
              <div class="detail-label">机器人类型</div>
              <div class="detail-value">
                <span v-for="(type, index) in selectedLocation.robotTypes" :key="index" class="robot-type-tag">
                  {{ type }}
                </span>
              </div>
            </div> -->
            <div class="detail-item">
              <div class="detail-label">电站容量</div>
              <div class="detail-value">{{ selectedLocation.capacity }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">国家/省份</div>
              <div class="detail-value">{{ selectedLocation.country }} / {{ selectedLocation.province }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-row">
                <div class="detail-group">
                  <div class="detail-label">业主</div>
                  <div class="detail-value">{{ selectedLocation.owner }}</div>
                </div>
                <div class="detail-group">
                  <div class="detail-label">EPC</div>
                  <div class="detail-value">{{ selectedLocation.epc }}</div>
                </div>
                <!-- <div class="detail-group">
                  <div class="detail-label">运维</div>
                  <div class="detail-value">{{ selectedLocation.operation }}</div>
                </div> -->
              </div>
            </div>
            <!-- <div class="detail-item">
              <div class="detail-label">运维</div>
              <div class="detail-value">{{ selectedLocation.operation }}</div>
            </div> -->
            <!-- <div class="detail-item full-width">
              <div class="detail-label">电站描述</div>
              <div class="detail-value">{{ selectedLocation.description }}</div>
            </div> -->
            
            <!-- 机器人统计 -->
            <div class="detail-section">
              <div class="detail-section-title">机器人活跃率</div>
              <!-- 活跃度统计 -->
              <div class="robot-stats-group">
                <div class="robot-stats-grid">
                  <div class="robot-stat-item">
                    <div class="robot-stat-icon active">
                      <img :src="getStationRobotImage(selectedLocation)" alt="活跃" />
                    </div>
                    <div class="robot-stat-content">
                      <div class="robot-stat-number">{{ robotStats.active }}</div>
                      <div class="robot-stat-label">活跃</div>
                    </div>
                  </div>
                  <div class="robot-stat-item">
                    <div class="robot-stat-icon inactive">
                      <img :src="getStationRobotImage(selectedLocation)" alt="不活跃" />
                    </div>
                    <div class="robot-stat-content">
                      <div class="robot-stat-number">{{ robotStats.inactive }}</div>
                      <div class="robot-stat-label">不活跃</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="detail-section-title">机器人告警率</div>
              <!-- 状态统计 -->
              <div class="robot-stats-group">
                <div class="robot-stats-grid">
                  <div class="robot-stat-item">
                    <div class="robot-stat-icon normal">
                      <img :src="getStationRobotImage(selectedLocation)" alt="正常" />
                    </div>
                    <div class="robot-stat-content">
                      <div class="robot-stat-number">{{ robotStats.normal }}</div>
                      <div class="robot-stat-label">正常</div>
                    </div>
                  </div>
                  <div class="robot-stat-item">
                    <div class="robot-stat-icon alarm">
                      <img :src="getStationRobotImage(selectedLocation)" alt="告警" />
                    </div>
                    <div class="robot-stat-content">
                      <div class="robot-stat-number">{{ robotStats.alarm }}</div>
                      <div class="robot-stat-label">告警</div>
                    </div>
                  </div>
                  <div class="robot-stat-item">
                    <div class="robot-stat-icon fault">
                      <img :src="getStationRobotImage(selectedLocation)" alt="故障" />
                    </div>
                    <div class="robot-stat-content">
                      <div class="robot-stat-number">{{ robotStats.fault }}</div>
                      <div class="robot-stat-label">故障</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
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

/* 隐藏 Cesium 底图选择器按钮 */
:deep(.cesium-viewer-toolbar) {
  display: none !important;
}

:deep(.cesium-baseLayerPicker-button) {
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

/* 密码验证蒙层 */
.auth-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.auth-box {
  background: rgba(0, 0, 0, 0.85);
  border-radius: 16px;
  padding: 40px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.auth-title {
  margin: 0 0 8px 0;
  color: #fff;
  font-size: 24px;
  font-weight: bold;
}

.auth-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.auth-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  outline: none;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.auth-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.auth-input:focus {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 107, 53, 0.6);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.auth-error {
  padding: 10px 14px;
  background: rgba(255, 68, 68, 0.2);
  border: 1px solid rgba(255, 68, 68, 0.4);
  border-radius: 6px;
  color: #ff6b6b;
  font-size: 14px;
  text-align: center;
}

.auth-button {
  width: 100%;
  padding: 14px 16px;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.auth-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
}

.auth-button:active {
  transform: translateY(0);
}

/* 蒙层淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 错误提示抖动动画 */
.shake-enter-active {
  animation: shake 0.5s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

/* 顶部统计面板 */
.stats-panel {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 8px;
  padding: 16px 24px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
}

.stats-item:first-child {
  padding-left: 0;
}

.stats-item:last-child {
  padding-right: 0;
}

.stats-icon {
  font-size: 32px;
  line-height: 1;
}

.stats-icon img {
  width: 40px;
  height: 40px;
  filter: brightness(0) saturate(100%) invert(100%);
}
.stats-image {
  font-size: 32px;
  line-height: 1;
}

.stats-image img {
  width: 40px;
  height: 40px;
  /* filter: brightness(0) saturate(100%) invert(100%); */
}
.stats-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stats-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.stats-value {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  line-height: 1;
}

.stats-unit {
  font-size: 14px;
  font-weight: normal;
  color: rgba(255, 255, 255, 0.8);
  margin-left: 4px;
}

.stats-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
}

/* 重置视角按钮 - 模仿 Cesium 工具栏按钮样式 */
.cesium-reset-button {
  position: absolute;
  top: 5px;
  right: 50px;  /* 放在全屏按钮左侧 */
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background-color: rgba(48, 51, 54, 0.8);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 1000;
}

.cesium-reset-button svg {
  color: #edffff;
  width: 16px;
  height: 16px;
}

.cesium-reset-button:hover {
  background-color: rgba(72, 94, 138, 0.9);
  transform: scale(1.05);
}

.cesium-reset-button:active {
  background-color: rgba(72, 94, 138, 1);
  transform: scale(0.98);
}

/* 右侧详情面板 */
.detail-panel {
  position: absolute;
  top: 20px;
  right: 10px;
  width: 300px;
  height: calc(100vh - 40px);
  background: rgba(0, 0, 0, 0.75);
  border-radius: 0;
  overflow: hidden;
  backdrop-filter: blur(10px);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  flex-direction: column;
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

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
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
  flex: 1;
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

.detail-row {
  display: flex;
  gap: 20px;
}

.detail-group {
  flex: 1;
}

/* 详情页分区样式 */
.detail-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-section-title {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-left: 4px;
}

/* 机器人统计分组 */
.robot-stats-group {
  margin-bottom: 20px;
}

.robot-stats-group:last-child {
  margin-bottom: 0;
}

/* 机器人统计网格 */
.robot-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.robot-stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

.robot-stat-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.robot-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.robot-stat-icon img {
  width: 32px;
  height: 32px;
  object-fit: cover;
}

/* 不同状态的图标背景色 */
.robot-stat-icon.normal {
  background: rgba(34, 197, 94, 0.2);
}

.robot-stat-icon.alarm {
  background: rgba(251, 191, 36, 0.2);
}

.robot-stat-icon.fault {
  background: rgba(239, 68, 68, 0.2);
}

.robot-stat-icon.active {
  background: rgba(59, 130, 246, 0.2);
}

.robot-stat-icon.inactive {
  background: rgba(107, 114, 128, 0.2);
}

.robot-stat-content {
  flex: 1;
}

.robot-stat-number {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}

.robot-stat-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  margin-top: 2px;
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
  left: 10px;
  width: 300px;
  height: calc(100vh - 40px);
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

/* 机器人类型单选按钮组 */
.robot-type-radio-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 12px;
}

.robot-type-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.robot-type-option input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #007bff;
}

.robot-type-option img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
}

/* 自定义下拉框 */
.custom-select {
  position: relative;
  width: 100%;
}

.custom-select-trigger {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.custom-select-trigger:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.custom-select-trigger .arrow {
  font-size: 10px;
  transition: transform 0.3s ease;
}

.custom-select-trigger .arrow.arrow-up {
  transform: rotate(180deg);
}

.custom-options {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  z-index: 1000;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.search-box {
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-input {
  width: 100%;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  outline: none;
  transition: all 0.3s ease;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 107, 53, 0.5);
}

.options-list {
  max-height: 200px;
  overflow-y: auto;
}

.options-list.no-search {
  max-height: 160px;
}

.options-list::-webkit-scrollbar {
  width: 6px;
}

.options-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.options-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.options-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.custom-option {
  padding: 10px 12px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.custom-option:hover {
  background: rgba(255, 107, 53, 0.2);
}

.custom-option.selected {
  background: rgba(255, 107, 53, 0.3);
  color: #ff6b35;
  font-weight: 500;
}

.no-options {
  padding: 10px 12px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  text-align: center;
}

/* 下拉框动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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
  min-height: 0;
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
  padding: 16px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.station-item:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateX(4px);
}

.station-header {
  margin-bottom: 12px;
}

.station-name {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  line-height: 1.2;
}

.station-location {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  line-height: 1.2;
}

.station-stats {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.stat-icon {
  font-size: 20px;
  line-height: 1;
}

.stat-icon img {
  width: 35px;
  height: 35px;
  object-fit: cover;
  border-radius: 2px;
  filter: brightness(0) saturate(100%) invert(100%);
}

.stat-image {
  font-size: 20px;
  line-height: 1;
}

.stat-image img {
  width: 35px;
  height: 35px;
  object-fit: cover;
  border-radius: 2px;
  /* filter: brightness(0) saturate(100%) invert(100%); */
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.stat-number {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 2px;
}

.stat-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  line-height: 1;
}
</style>

