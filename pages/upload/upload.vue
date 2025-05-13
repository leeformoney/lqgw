<template>
	<view class="container" style="min-height:100vh">
		<!-- 当前位置显示 -->
		<view class="location-info">
			<text class="location-title">当前位置：</text>
			<text class="branch">{{ branchName }}</text>
			<text class="separator">/</text>
			<text class="village">{{ villageName }}</text>
		</view>

		<!-- 文件选择按钮 -->
		<button type="primary" @tap="chooseImages" :disabled="uploading" class="upload-btn">
			{{ uploading ? '上传中...' : '选择图片' }}
		</button>
		<text class="tip-text">最多可选择9张图片</text>
		<!-- 新增：查看记录按钮 -->
	    <!-- 调整后的查看记录按钮 -->
	    <view class="view-record-btn">
	      <button 
	        type="default" 
	        @click="navigateToRecords"
	        class="record-btn"
	      >
	        查看我的记录
	      </button>
	    </view>
		<!-- 已选图片预览 -->
		<view class="image-list" v-if="selectedImages.length > 0">
			<view class="image-item" v-for="(img, index) in selectedImages" :key="index">
				<image :src="img.path" mode="aspectFill" class="preview-image" @click="previewImage(index)"></image>
				<text class="image-name">{{ img.name }}</text>
				<text class="image-size">{{ formatFileSize(img.size) }}</text>
				<button class="delete-btn" @click="removeImage(index)" size="mini">删除</button>
			</view>
		</view>

		<!-- 上传按钮 -->
		<button type="primary" @tap="uploadAllImages" :disabled="uploading || selectedImages.length === 0"
			class="upload-btn">
			{{ uploading ? `上传中(${uploadedCount}/${selectedImages.length})` : '开始上传' }}
		</button>

		<!-- 调试信息 -->
		<view v-if="debugInfo" class="debug-info">
			{{ debugInfo }}
		</view>

		<!-- 新增：常驻底部联系方式提示栏 -->
		<view class="footer-contact">
			<text>如有疑问请联系李号：15345581616</text>
		</view>
	</view>
</template>

<script>
	import {
		ossUpload
	} from '@/js_sdk/jason-alioss-upload/oss.js'

	export default {
		data() {
			return {
				branchName: '', // 营业部名称
				villageName: '', // 行政村名称
				selectedImages: [], // 已选图片列表
				uploading: false, // 上传状态
				uploadedCount: 0, // 已上传计数
				debugInfo: '', // 调试信息
				contactInfo: '如有疑问请联系李号（15345581616）' // 联系方式
			}
		},
		onLoad(options) {
			// 接收营业部和行政村参数
			this.branchName = options.branchName ? decodeURIComponent(options.branchName) : '未选择营业部'
			this.villageName = options.villageName ? decodeURIComponent(options.villageName) : '未选择行政村'

			this.debugInfo = `页面加载完成，位置：${this.branchName}/${this.villageName}`
		},
		methods: {
			// 选择多张图片
			chooseImages() {
				uni.chooseImage({
					count: 9,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera'],
					success: (res) => {
						this.selectedImages = res.tempFilePaths.map((path, index) => ({
							path: path,
							name: this.generateFileName(res.tempFiles[index]),
							size: res.tempFiles[index].size,
							uploaded: false
						}))
						this.debugInfo = `已选择 ${this.selectedImages.length} 张图片`
					},
					fail: (err) => {
						this.debugInfo = `选择图片失败: ${err.errMsg}`
						uni.showToast({
							title: `选择失败，${this.contactInfo}`,
							icon: 'none',
							duration: 3000
						})
						console.error('选择图片失败:', err)
					}
				})
			},
		// 新增：跳转到记录页面
			navigateToRecords() {
			  uni.switchTab({
				url: '/pages/my-uploads/my-uploads'
			  })
			},
			// 生成唯一文件名
			generateFileName(file) {
				const ext = file.path.split('.').pop() || 'jpg'
				const timestamp = new Date().getTime()
				const randomStr = Math.random().toString(36).substr(2, 6)
				return `${timestamp}_${randomStr}.${ext}`
			},

			// 格式化文件大小
			formatFileSize(bytes) {
				if (!bytes) return '0 B'
				const k = 1024
				const sizes = ['B', 'KB', 'MB', 'GB']
				const i = Math.floor(Math.log(bytes) / Math.log(k))
				return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
			},

			// 删除图片
			removeImage(index) {
				this.selectedImages.splice(index, 1)
				this.debugInfo = `已删除图片，剩余 ${this.selectedImages.length} 张`
			},

			// 预览图片
			previewImage(index) {
				uni.previewImage({
					current: index,
					urls: this.selectedImages.map(img => img.path)
				})
			},

			// 上传所有图片
			async uploadAllImages() {
				if (!this.branchName || !this.villageName) {
					this.debugInfo = '错误：缺少营业部或行政村信息'
					uni.showToast({
						title: '请先选择营业部和行政村',
						icon: 'none'
					})
					return
				}

				this.uploading = true
				this.uploadedCount = 0
				this.debugInfo = '开始上传...'

				try {
					// 创建OSS目录路径：营业部/行政村/
					const ossDir = `${this.branchName}/${this.villageName}/`

					for (let i = 0; i < this.selectedImages.length; i++) {
						const img = this.selectedImages[i]
						const ossPath = ossDir + img.name

						this.debugInfo = `正在上传 ${i+1}/${this.selectedImages.length}: ${img.name}`

						const {
							success,
							data
						} = await ossUpload(
							img.path,
							ossPath,
							ossDir
						)

						if (success) {
							this.uploadedCount++
							img.uploaded = true
							img.url = data
							this.$set(this.selectedImages, i, img)
						} else {
							throw new Error(`上传失败: ${data}`)
						}
					}

					this.debugInfo = `上传完成，成功 ${this.uploadedCount} 张`
					uni.showToast({
						title: '上传成功',
						icon: 'success'
					})

					// 保存上传记录
					this.saveUploadRecords()

				} catch (error) {
					this.debugInfo = `上传出错: ${error.message}`
					console.error('上传出错:', error)
					uni.showModal({
						title: '上传失败',
						content: `上传失败，请重新尝试。${this.contactInfo}`,
						confirmText: '重新上传',
						cancelText: '我知道了',
						success: (res) => {
							if (res.confirm) {
								this.uploadAllImages() // 用户点击重新上传
							}
						}
					})
				} finally {
					this.uploading = false
				}
			},

			saveUploadRecords() {
				const records = uni.getStorageSync('uploadRecords') || []
				const newRecords = this.selectedImages
					.filter(img => img.uploaded)
					.map(img => ({
						// 统一使用 record.village 作为行政村字段名
						village: this.villageName,
						// 统一使用 record.url 作为图片URL字段名
						url: img.url,
						// 其他兼容字段
						villageName: this.villageName, // 兼容旧字段
						fileUrl: img.url, // 兼容旧字段
						branch: this.branchName,
						fileName: img.name, // 兼容旧字段
						name: img.name,
						fileSize: img.size, // 兼容旧字段
						size: img.size,
						uploadTime: new Date().toISOString(), // 兼容旧字段
						time: new Date().toISOString()
					}))

				uni.setStorageSync('uploadRecords', [...newRecords, ...records])
			}
		}
	}
</script>

<style>
.container {
  padding: 20px;
  padding-bottom: 120px; /* 为底部元素留出足够空间 */
  display: flex;
  flex-direction: column;
}

.location-info {
  display: flex;
  align-items: center;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 20px;
}

.location-title {
  font-weight: bold;
  margin-right: 5px;
}

.branch, .village {
  color: #1890ff;
}

.separator {
  margin: 0 5px;
  color: #666;
}

.upload-btn {
  margin: 15px 0;
  width: 100%;
}

.tip-text {
  font-size: 12px;
  color: #999;
  margin-bottom: 15px;
  text-align: center;
}

.image-list {
  margin: 15px 0;
}

.image-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.preview-image {
  width: 80px;
  height: 80px;
  margin-right: 10px;
  border-radius: 4px;
}

.image-name {
  flex: 1;
  font-size: 14px;
  margin-right: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-size {
  color: #999;
  font-size: 12px;
  margin-right: 10px;
}

.delete-btn {
  margin: 0;
  padding: 0 10px;
}

.debug-info {
  margin-top: 20px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

/* 新增样式 */
.view-record-btn {
  margin: 25px 0;
  width: 100%;
}

.record-btn {
  width: 100%;
  background-color: #f5f5f5;
  color: #333;
  border-radius: 4px;
  padding: 10px 0;
}

.footer-tip {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 20px;
  background: #f5f5f5;
  text-align: center;
  font-size: 12px;
  color: #666;
  border-top: 1px solid #eee;
  z-index: 100;
}

/* 响应式调整 */
@media (min-height: 800px) {
  .view-record-btn {
    position: fixed;
    bottom: 70px;
    left: 20px;
    right: 20px;
    margin: 0;
  }
  
  .container {
    padding-bottom: 160px;
  }
}
</style>