<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { getStationList, createStation, updateStation, getNations, createUrl } from '@/api/station'
import { RobotType } from '@/types/station'
import type { StationDto, StationQueryObj, StationSaveCmd, StationUpdateCmd, Pageable, NationDto } from '@/types/station'
import type { UploadProps } from 'element-plus'

// 响应式数据
const loading = ref(false)
const dialogVisible = ref(false)
const editDialogVisible = ref(false)
const stationList = ref<StationDto[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const editingStationId = ref<number | null>(null)

// 图片预览
const addImageUrl = ref('')
const editImageUrl = ref('')

// 上传接口地址（使用相对路径，会自动使用 ApiService 的 baseURL）
const uploadAction = '/api/files/upload'

// 上传请求头（使用 Basic 认证，与 ApiService 保持一致）
const uploadHeaders = computed(() => {
  return {
    Authorization: 'Basic YWRtaW46YWRtaW4='
  }
})

// 国家列表
const nationList = ref<NationDto[]>([])

// 省份列表（JSON数据）
const provinceList = [
  '北京', '天津', '河北', '山西', '内蒙古',
  '辽宁', '吉林', '黑龙江', '上海', '江苏',
  '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '广西',
  '海南', '重庆', '四川', '贵州', '云南',
  '西藏', '陕西', '甘肃', '青海', '宁夏',
  '新疆', '台湾', '香港', '澳门'
]

// 搜索表单
const searchForm = reactive<StationQueryObj>({
  name: '',
  robotType: undefined,
  country: '',
  province: ''
})

// 新增表单
const addForm = reactive<StationSaveCmd>({
  name: '',
  lat: 0,
  lon: 0,
  robotNum: 0,
  robotType: RobotType.ROBOT,
  description: '',
  capacity: 0,
  country: '',
  province: '',
  owner: '',
  epc: '',
  operation: '',
  image: '',
  height: 0
})

// 编辑表单
const editForm = reactive<StationUpdateCmd>({
  name: '',
  lat: 0,
  lon: 0,
  robotNum: 0,
  robotType: RobotType.ROBOT,
  description: '',
  capacity: 0,
  country: '',
  province: '',
  owner: '',
  epc: '',
  operation: '',
  image: '',
  height: 0,
  address: ''
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入电站名称', trigger: 'blur' }
  ],
  lat: [
    { required: true, message: '请输入纬度', trigger: 'blur' },
    { type: 'number', min: -90, max: 90, message: '纬度必须在-90到90之间', trigger: 'blur' }
  ],
  lon: [
    { required: true, message: '请输入经度', trigger: 'blur' },
    { type: 'number', min: -180, max: 180, message: '经度必须在-180到180之间', trigger: 'blur' }
  ],
  robotNum: [
    { required: true, message: '请输入机器人数量', trigger: 'blur' },
    { type: 'number', min: 1, message: '机器人数量必须大于0', trigger: 'blur' }
  ],
  capacity: [
    { required: true, message: '请输入电站容量', trigger: 'blur' },
    { type: 'number', min: 0, message: '电站容量必须大于等于0', trigger: 'blur' }
  ],
  country: [
    { required: true, message: '请选择国家', trigger: 'change' }
  ]
}

const addFormRules = {
  ...formRules,
  province: [
    { 
      required: false,
      validator: (_rule: any, value: any, callback: any) => {
        if (addForm.country === '中国' && !value) {
          callback(new Error('请选择省份'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

const editFormRules = {
  ...formRules,
  province: [
    { 
      required: false,
      validator: (_rule: any, value: any, callback: any) => {
        if (editForm.country === '中国' && !value) {
          callback(new Error('请选择省份'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 机器人类型选项
const robotTypeOptions = [
  { value: RobotType.ROBOT, label: '干挂式' },
  { value: RobotType.TRACKLESS, label: '分布式' },
  { value: RobotType.AGV, label: 'AGV' }
]

// 获取国家列表
const fetchNations = async () => {
  try {
    nationList.value = await getNations()
  } catch (error) {
    console.error('获取国家列表失败:', error)
  }
}

// 获取电站列表
const fetchStationList = async () => {
  loading.value = true
  try {
    const pageable: Pageable = {
      page: currentPage.value - 1,
      size: pageSize.value
    }
    
    const result = await getStationList(searchForm, pageable)
    stationList.value = result.content
    total.value = result.totalElements
  } catch (error) {
    ElMessage.error('获取电站列表失败')
    console.error('获取电站列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  fetchStationList()
}

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    name: '',
    robotType: undefined,
    country: '',
    province: ''
  })
  handleSearch()
}

// 分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchStationList()
}

// 页面大小变化
const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  fetchStationList()
}

// 打开新增对话框
const handleAdd = () => {
  dialogVisible.value = true
  resetAddForm()
}

// 重置新增表单
const resetAddForm = () => {
  Object.assign(addForm, {
    name: '',
    lat: 0,
    lon: 0,
    robotNum: 0,
    robotType: RobotType.ROBOT,
    description: '',
    capacity: 0,
    country: '',
    province: '',
    owner: '',
    epc: '',
    operation: '',
    image: '',
    height: 0
  })
  addImageUrl.value = ''
}

// 提交新增表单
const handleSubmit = async () => {
  try {
    await createStation(addForm)
    ElMessage.success('创建电站成功')
    dialogVisible.value = false
    fetchStationList()
  } catch (error) {
    ElMessage.error('创建电站失败')
    console.error('创建电站失败:', error)
  }
}

// 取消新增
const handleCancel = () => {
  dialogVisible.value = false
  resetAddForm()
}

// 格式化机器人类型
const formatRobotType = (type: string) => {
  const option = robotTypeOptions.find(opt => opt.value === type)
  return option ? option.label : type
}

// 监听国家变化，如果不是中国则清空省份
const handleCountryChange = () => {
  if (addForm.country !== '中国') {
    addForm.province = ''
  }
}

// 监听编辑表单国家变化
const handleEditCountryChange = () => {
  if (editForm.country !== '中国') {
    editForm.province = ''
  }
}

// 处理新增表单图片上传成功
const handleAddImageSuccess: UploadProps['onSuccess'] = (response) => {
  console.log(response)
  if (response.status === 'SUCCESS') {
    addForm.image = response.data.image
    addImageUrl.value = response.data.imageUrl
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error('图片上传失败')
  }
}

// 处理编辑表单图片上传成功
const handleEditImageSuccess: UploadProps['onSuccess'] = (response) => {
  if (response.status === 'SUCCESS') {
    editForm.image = response.data.image
    editImageUrl.value = response.data.imageUrl
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error('图片上传失败')
  }
}

// 上传前验证
const beforeImageUpload: UploadProps['beforeUpload'] = (rawFile) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(rawFile.type)) {
    ElMessage.error('图片格式必须是 JPG/PNG/GIF/WEBP!')
    return false
  }
  if (rawFile.size / 1024 / 1024 > 5) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

// 删除新增表单图片
const handleAddImageRemove = () => {
  addForm.image = ''
  addImageUrl.value = ''
}

// 删除编辑表单图片
const handleEditImageRemove = () => {
  editForm.image = ''
  editImageUrl.value = ''
}

// 打开编辑对话框
const handleEdit = async (row: StationDto) => {
  editingStationId.value = row.id
  Object.assign(editForm, {
    name: row.name,
    lat: row.lat,
    lon: row.lon,
    robotNum: row.robotNum,
    robotType: row.robotType,
    description: row.description || '',
    capacity: row.capacity,
    country: row.country,
    province: row.province || '',
    owner: row.owner || '',
    epc: row.epc || '',
    operation: row.operation || '',
    image: row.image || '',
    height: row.height || 0,
    address: ''
  })
  
  // 设置编辑图片预览 (如果已有图片，从后端获取URL)
  if (row.image) {
    try {
      const imageUrl = await createUrl(row.image)
      editImageUrl.value = imageUrl
    } catch (error) {
      console.error('获取图片URL失败:', error)
      editImageUrl.value = ''
    }
  } else {
    editImageUrl.value = ''
  }
  
  editDialogVisible.value = true
}

// 提交编辑表单
const handleEditSubmit = async () => {
  if (!editingStationId.value) return
  
  try {
    await updateStation(editingStationId.value, editForm)
    ElMessage.success('更新电站成功')
    editDialogVisible.value = false
    fetchStationList()
  } catch (error) {
    ElMessage.error('更新电站失败')
    console.error('更新电站失败:', error)
  }
}

// 取消编辑
const handleEditCancel = () => {
  editDialogVisible.value = false
  editingStationId.value = null
}

// 组件挂载时获取数据
onMounted(() => {
  fetchStationList()
  fetchNations()
})
</script>

<template>
  <div class="station-management">
    <!-- 列表区域 -->
    <el-card class="table-card">
      <!-- 搜索区域 -->
      <div class="search-container">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="电站名称">
            <el-input
              v-model="searchForm.name"
              placeholder="请输入电站名称"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          
          <el-form-item label="机器人类型">
            <el-select
              v-model="searchForm.robotType"
              placeholder="请选择机器人类型"
              clearable
              style="width: 150px"
            >
              <el-option
                v-for="option in robotTypeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="国家">
            <el-input
              v-model="searchForm.country"
              placeholder="请输入国家"
              clearable
              style="width: 150px"
            />
          </el-form-item>
          
          <el-form-item label="省份">
            <el-input
              v-model="searchForm.province"
              placeholder="请输入省份"
              clearable
              style="width: 150px"
            />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">
              搜索
            </el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
        
        <div class="action-buttons">
          <el-button type="primary" :icon="Plus" @click="handleAdd">
            新增电站
          </el-button>
        </div>
      </div>

      <!-- 分隔线 -->
      <el-divider style="margin: 20px 0" />

      <!-- 表格 -->
      <el-table
        :data="stationList"
        :loading="loading"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="电站名称" min-width="150" />
        <el-table-column prop="lat" label="纬度" width="120" />
        <el-table-column prop="lon" label="经度" width="120" />
        <el-table-column prop="height" label="高度(m)" width="100" />
        <el-table-column prop="robotNum" label="机器人数量" width="120" />
        <el-table-column prop="robotType" label="机器人类型" width="120">
          <template #default="{ row }">
            {{ formatRobotType(row.robotType) }}
          </template>
        </el-table-column>
        <el-table-column prop="capacity" label="容量(MW)" width="120" />
        <el-table-column prop="country" label="国家" width="100" />
        <el-table-column prop="province" label="省份" width="100" />
        <el-table-column prop="owner" label="业主" min-width="120" />
        <el-table-column prop="epc" label="EPC" min-width="120" />
        <el-table-column prop="operation" label="运维" min-width="120" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 新增对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="新增电站"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addFormRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="电站名称" prop="name">
              <el-input v-model="addForm.name" placeholder="请输入电站名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="机器人类型" prop="robotType">
              <el-select v-model="addForm.robotType" placeholder="请选择机器人类型">
                <el-option
                  v-for="option in robotTypeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="纬度" prop="lat">
              <el-input-number
                v-model="addForm.lat"
                :precision="6"
                :min="-90"
                :max="90"
                placeholder="纬度"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="经度" prop="lon">
              <el-input-number
                v-model="addForm.lon"
                :precision="6"
                :min="-180"
                :max="180"
                placeholder="经度"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="高度(m)" prop="height">
              <el-input-number
                v-model="addForm.height"
                :precision="2"
                :min="0"
                placeholder="高度"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="机器人数量" prop="robotNum">
              <el-input-number
                v-model="addForm.robotNum"
                :min="1"
                placeholder="机器人数量"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="容量(MW)" prop="capacity">
              <el-input-number
                v-model="addForm.capacity"
                :precision="2"
                :min="0"
                placeholder="电站容量"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="国家" prop="country">
              <el-select 
                v-model="addForm.country" 
                placeholder="请选择国家"
                @change="handleCountryChange"
                style="width: 100%"
              >
                <el-option
                  v-for="nation in nationList"
                  :key="nation.id"
                  :label="nation.name"
                  :value="nation.name"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="addForm.country === '中国'">
            <el-form-item label="省份" prop="province">
              <el-select 
                v-model="addForm.province" 
                placeholder="请选择省份"
                style="width: 100%"
              >
                <el-option
                  v-for="province in provinceList"
                  :key="province"
                  :label="province"
                  :value="province"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="业主" prop="owner">
              <el-input v-model="addForm.owner" placeholder="请输入业主" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="EPC" prop="epc">
              <el-input v-model="addForm.epc" placeholder="请输入EPC" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="运维" prop="operation">
          <el-input v-model="addForm.operation" placeholder="请输入运维" />
        </el-form-item>

        <el-form-item label="电站图片" prop="image">
          <el-upload
            class="image-uploader"
            :action="uploadAction"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleAddImageSuccess"
            :before-upload="beforeImageUpload"
            accept="image/*"
          >
            <img v-if="addImageUrl" :src="addImageUrl" class="uploaded-image" />
            <el-icon v-else class="upload-icon"><Plus /></el-icon>
          </el-upload>
          <el-button 
            v-if="addImageUrl" 
            size="small" 
            type="danger" 
            @click="handleAddImageRemove"
            style="margin-left: 10px"
          >
            删除图片
          </el-button>
        </el-form-item>

        <el-form-item label="电站描述" prop="description">
          <el-input
            v-model="addForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入电站描述"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑电站"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editFormRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="电站名称" prop="name">
              <el-input v-model="editForm.name" placeholder="请输入电站名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="机器人类型" prop="robotType">
              <el-select v-model="editForm.robotType" placeholder="请选择机器人类型">
                <el-option
                  v-for="option in robotTypeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="纬度" prop="lat">
              <el-input-number
                v-model="editForm.lat"
                :precision="6"
                :min="-90"
                :max="90"
                placeholder="纬度"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="经度" prop="lon">
              <el-input-number
                v-model="editForm.lon"
                :precision="6"
                :min="-180"
                :max="180"
                placeholder="经度"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="高度(m)" prop="height">
              <el-input-number
                v-model="editForm.height"
                :precision="2"
                :min="0"
                placeholder="高度"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="机器人数量" prop="robotNum">
              <el-input-number
                v-model="editForm.robotNum"
                :min="1"
                placeholder="机器人数量"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="容量(MW)" prop="capacity">
              <el-input-number
                v-model="editForm.capacity"
                :precision="2"
                :min="0"
                placeholder="电站容量"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="国家" prop="country">
              <el-select 
                v-model="editForm.country" 
                placeholder="请选择国家"
                @change="handleEditCountryChange"
                style="width: 100%"
              >
                <el-option
                  v-for="nation in nationList"
                  :key="nation.id"
                  :label="nation.name"
                  :value="nation.name"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="editForm.country === '中国'">
            <el-form-item label="省份" prop="province">
              <el-select 
                v-model="editForm.province" 
                placeholder="请选择省份"
                style="width: 100%"
              >
                <el-option
                  v-for="province in provinceList"
                  :key="province"
                  :label="province"
                  :value="province"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="业主" prop="owner">
              <el-input v-model="editForm.owner" placeholder="请输入业主" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="EPC" prop="epc">
              <el-input v-model="editForm.epc" placeholder="请输入EPC" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="运维" prop="operation">
          <el-input v-model="editForm.operation" placeholder="请输入运维" />
        </el-form-item>

        <el-form-item label="电站图片" prop="image">
          <el-upload
            class="image-uploader"
            :action="uploadAction"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleEditImageSuccess"
            :before-upload="beforeImageUpload"
            accept="image/*"
          >
            <img v-if="editImageUrl" :src="editImageUrl" class="uploaded-image" />
            <el-icon v-else class="upload-icon"><Plus /></el-icon>
          </el-upload>
          <el-button 
            v-if="editImageUrl" 
            size="small" 
            type="danger" 
            @click="handleEditImageRemove"
            style="margin-left: 10px"
          >
            删除图片
          </el-button>
        </el-form-item>

        <el-form-item label="地址" prop="address">
          <el-input v-model="editForm.address" placeholder="请输入地址" />
        </el-form-item>

        <el-form-item label="电站描述" prop="description">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入电站描述"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleEditCancel">取消</el-button>
          <el-button type="primary" @click="handleEditSubmit">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.station-management {
  padding: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.search-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  flex: 1;
}

.search-form :deep(.el-form-item) {
  margin-bottom: 0;
  display: inline-flex;
  align-items: center;
}

.action-buttons {
  margin-left: 20px;
  display: flex;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.dialog-footer {
  text-align: right;
}

/* 图片上传样式 */
.image-uploader {
  display: inline-block;
  vertical-align: top;
}

.image-uploader :deep(.el-upload) {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  width: 148px;
  height: 148px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.upload-icon {
  font-size: 28px;
  color: #8c939d;
}

.uploaded-image {
  width: 148px;
  height: 148px;
  object-fit: cover;
  display: block;
}
</style>
