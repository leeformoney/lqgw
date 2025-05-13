<template>
  <view class="file-list-page">
    <!-- 顶部导航 -->
    <uni-nav-bar 
      left-icon="arrowleft" 
      :title="navTitle"
      @clickLeft="goBack"
    ></uni-nav-bar>

    <!-- 文件列表 -->
    <scroll-view scroll-y class="file-scroll-view">
      <view v-if="loading" class="loading-container">
        <uni-load-more status="loading"></uni-load-more>
      </view>

      <view v-else-if="files.length === 0" class="empty-state">
        <uni-icons type="info" size="48" color="#999"></uni-icons>
        <text class="empty-text">没有找到文件</text>
      </view>

      <view v-else class="file-grid">
        <view 
          v-for="(file, index) in files" 
          :key="index" 
          class="file-item"
          @click="previewFile(file, index)"
        >
          <image 
            v-if="isImage(file.name)" 
            :src="file.url" 
            mode="aspectFill" 
            class="file-thumbnail"
          ></image>
          <view v-else class="file-icon-container">
            <uni-icons type="paperclip" size="32" color="#1890ff"></uni-icons>
          </view>
          <text class="file-name">{{ getShortName(file.name) }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部统计 -->
    <view class="file-stats">
      <text>共 {{ files.length }} 个文件</text>
    </view>
  </view>
</template>

<script>
import { listOSSFiles } from '@/js_sdk/jason-alioss-upload/oss.js'

export default {
  data() {
    return {
      branchName: '',
      villageName: '',
      files: [],
      loading: false
    }
  },
  computed: {
    navTitle() {
      return `${this.branchName}/${this.villageName}`
    }
  },
  onLoad(options) {
    this.branchName = decodeURIComponent(options.branch)
    this.villageName = decodeURIComponent(options.village)
    this.loadFiles()
  },
  methods: {
    async loadFiles() {
      this.loading = true
      try {
        const prefix = `${this.branchName}/${this.villageName}/`
        const result = await listOSSFiles({
          prefix: prefix,
          maxKeys: 200
        })
        
        this.files = result.objects.map(file => ({
          name: file.name.replace(prefix, ''),
          url: file.url,
          size: file.size,
          lastModified: file.lastModified
        }))
      } catch (error) {
        console.error('获取文件列表失败:', error)
        uni.showToast({
          title: '获取文件列表失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    isImage(filename) {
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
      const ext = filename.split('.').pop().toLowerCase()
      return imageExts.includes(ext)
    },
    
    getShortName(filename) {
      if (filename.length > 12) {
        return filename.substring(0, 6) + '...' + filename.slice(-6)
      }
      return filename
    },
    
    previewFile(file, index) {
      if (this.isImage(file.name)) {
        const images = this.files
          .filter(f => this.isImage(f.name))
          .map(f => f.url)
        
        uni.previewImage({
          current: images[index],
          urls: images
        })
      } else {
        uni.showModal({
          title: '文件预览',
          content: '非图片文件无法预览，是否下载查看？',
          success: (res) => {
            if (res.confirm) {
              uni.downloadFile({
                url: file.url,
                success: (downloadRes) => {
                  if (downloadRes.statusCode === 200) {
                    uni.openDocument({
                      filePath: downloadRes.tempFilePath,
                      showMenu: true
                    })
                  }
                }
              })
            }
          }
        })
      }
    },
    
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style>
.file-list-page {
  height: 100vh;
  background-color: #f8f8f8;
}

.file-scroll-view {
  height: calc(100vh - 100px);
  padding: 10px;
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.file-item {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.file-thumbnail {
  width: 100%;
  height: 100px;
  border-radius: 4px;
  margin-bottom: 5px;
}

.file-icon-container {
  width: 100%;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  border-radius: 4px;
  margin-bottom: 5px;
}

.file-name {
  font-size: 12px;
  color: #333;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-container,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.empty-text {
  margin-top: 10px;
  color: #999;
  font-size: 14px;
}

.file-stats {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px;
  background-color: #fff;
  border-top: 1px solid #eee;
  text-align: center;
  font-size: 14px;
  color: #666;
}
</style>