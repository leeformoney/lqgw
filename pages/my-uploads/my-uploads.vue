<template>
  <view class="container">
    <view class="header">
      <text class="title">我的上传记录</text>
      <button @click="checkStorage" size="mini">调试存储</button>
    </view>
    
    <!-- 按行政村分组显示 -->
    <view class="village-group" v-for="(group, village) in groupedRecords" :key="village">
      <view class="village-header">
        <text class="village-name">{{ village || '未记录行政村' }}</text>
        <text class="count">({{ group.length }}张)</text>
      </view>
      
      <view class="photo-grid">
        <block v-for="(record, index) in group" :key="index">
          <view class="photo-item">
            <image 
              class="upload-image" 
              :src="record.url || record.fileUrl" 
              mode="aspectFill"
              @click="previewImage(record.url || record.fileUrl, group)"
              @error="handleImageError(village, index)"
            ></image>
            <text class="time">{{ formatTime(record.time || record.uploadTime) }}</text>
          </view>
        </block>
      </view>
    </view>
    
    <view v-if="uploadRecords.length === 0" class="empty-tip">
      <text>暂无上传记录</text>
      <text v-if="storageError" class="error-text">{{ storageError }}</text>
    </view>
    
    <!-- 常驻底部提示 -->
    <view class="footer-tip">
      <text>如有疑问请联系李号：15345581616</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      uploadRecords: [],
      storageError: '',
      groupedRecords: {}
    }
  },
  onShow() {
    this.loadUploadRecords()
  },
  methods: {
    loadUploadRecords() {
      try {
        // 尝试不同版本的存储键名
        const records = uni.getStorageSync('uploadRecords') || []
        console.log('加载到的记录:', records)
        
        // 过滤无效记录
        this.uploadRecords = records.filter(item => item && (item.url || item.fileUrl))
        
        // 按行政村分组
        this.groupRecordsByVillage()
        
        if (records.length === 0) {
          this.storageError = '提示：未找到任何上传记录'
        }
      } catch (e) {
        console.error('读取存储失败:', e)
        this.storageError = '读取记录失败，请重试'
      }
    },
    
    // 按行政村分组记录
    groupRecordsByVillage() {
      const groups = {}
      this.uploadRecords.forEach(record => {
        const village = record.village || record.villageName || '未记录行政村'
        if (!groups[village]) {
          groups[village] = []
        }
        groups[village].push(record)
      })
      this.groupedRecords = groups
    },
    
    checkStorage() {
      const info = uni.getStorageInfoSync()
      console.log('存储信息:', info)
      uni.showModal({
        title: '调试信息',
        content: `共 ${info.keys.length} 条存储，当前使用 ${info.currentSize}KB`,
        showCancel: false
      })
    },
    
    handleImageError(village, index) {
      console.warn('图片加载失败:', this.groupedRecords[village][index].url)
      this.$set(this.groupedRecords[village][index], 'loadError', true)
    },
    
    formatTime(timeStr) {
      if (!timeStr) return '未知时间'
      try {
        const date = new Date(timeStr)
        return `${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`
      } catch {
        return timeStr
      }
    },
    
    previewImage(url, group) {
      if (!url) {
        uni.showToast({ title: '图片链接无效', icon: 'none' })
        return
      }
      uni.previewImage({
        current: url,
        urls: group.map(item => item.url || item.fileUrl).filter(Boolean)
      })
    },
    
    deleteRecord(village, index) {
      uni.showModal({
        title: '提示',
        content: '确定要删除这条记录吗？',
        success: (res) => {
          if (res.confirm) {
            // 从分组中删除
            this.groupedRecords[village].splice(index, 1)
            
            // 更新本地存储
            const allRecords = []
            Object.values(this.groupedRecords).forEach(group => {
              allRecords.push(...group)
            })
            uni.setStorageSync('uploadRecords', allRecords)
            
            uni.showToast({ title: '删除成功' })
            
            // 如果该行政村没有记录了，移除分组
            if (this.groupedRecords[village].length === 0) {
              delete this.groupedRecords[village]
            }
          }
        }
      })
    }
  }
}
</script>

<style>
.container {
  padding: 15px;
  padding-bottom: 60px; /* 给底部提示留空间 */
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.title {
  font-size: 18px;
  font-weight: bold;
}

.village-group {
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
}

.village-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.village-name {
  font-weight: bold;
  font-size: 16px;
}

.count {
  color: #666;
  font-size: 14px;
  margin-left: 8px;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.photo-item {
  position: relative;
  aspect-ratio: 1;
}

.upload-image {
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

.time {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0,0,0,0.5);
  color: white;
  font-size: 10px;
  padding: 2px 4px;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #999;
}

.error-text {
  color: #ff4d4f;
  font-size: 12px;
  display: block;
  margin-top: 10px;
}

.footer-tip {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: #f5f5f5;
  text-align: center;
  font-size: 12px;
  color: #666;
  border-top: 1px solid #eee;
}
</style>