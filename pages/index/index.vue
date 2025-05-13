<template>
  <view class="container">
    <view class="header">
      <text class="title">请选择您所在的营业部</text>
      <text class="subtitle" v-if="lastSelectedBranch">上次选择: {{ lastSelectedBranch }}</text>
    </view>
		<!-- 新增：管理按钮 -->
		    <view class="admin-btn-container">
		      <button 
		        class="admin-btn" 
		        @click="navigateToOSSManager"
		        type="default"
		      >
		        <uni-icons type="gear" size="16" color="#666"></uni-icons>
		        OSS文件管理
		      </button>
		    </view>
    <view class="branch-list">
      <block v-for="(branch, index) in branches" :key="index">
        <view class="branch-item" @click="selectBranch(branch)">
          <text>{{ branch }}</text>
          <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
        </view>
      </block>
    </view>
  </view>
</template>

<script>
import branchData from '@/data/branches.js'

export default {
  data() {
    return {
      branches: [],  // 初始化为空数组
      lastSelectedBranch: ''
    }
  },
  onLoad() {
    this.loadBranches()
  },
  onShow() {
    this.lastSelectedBranch = uni.getStorageSync('lastSelectedBranch') || ''
  },
  methods: {
    loadBranches() {
      try {
        // 确保 branchData 已正确加载
        if (branchData && typeof branchData === 'object') {
          this.branches = Object.keys(branchData)
          console.log('加载营业部数据:', this.branches) // 调试用
        } else {
          console.error('branchData 数据格式不正确')
        }
      } catch (e) {
        console.error('加载营业部数据失败:', e)
        uni.showToast({
          title: '加载营业部失败',
          icon: 'none'
        })
      }
    },
    selectBranch(branch) {
      uni.setStorageSync('lastSelectedBranch', branch)
      uni.navigateTo({
        url: `/pages/villages/villages?branchName=${encodeURIComponent(branch)}`
      })
    },
    // 新增：跳转到OSS管理页面
    navigateToOSSManager() {
      uni.navigateTo({
        url: '/pages/oss-manager/index'
      })
    }
  }
}
</script>

<style>
.container {
  padding: 20rpx;
}

.header {
  padding: 30rpx 0;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
}

.subtitle {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-top: 10rpx;
}

.branch-list {
  margin-top: 20rpx;
}

.branch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
  font-size: 32rpx;
}

/* 新增：管理按钮样式 */
.admin-btn-container {
  margin: 30rpx 0;
  padding: 0 20rpx;
}

.admin-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  color: #333;
  font-size: 28rpx;
  height: 80rpx;
  border-radius: 8rpx;
}

.admin-btn .uni-icons {
  margin-right: 10rpx;
}
</style>