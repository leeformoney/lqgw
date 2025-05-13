<template>
  <view class="container">
    <view class="header">
      <view class="header-top">
        <text class="title">{{ branchName }} - 请选择行政村</text>
        <button class="change-branch" @click="changeBranch" size="mini">切换营业部</button>
      </view>
    </view>
    
    <view class="village-list">
      <block v-for="(village, index) in villages" :key="index">
        <view class="village-item" @click="selectVillage(village)">
          <text>{{ village }}</text>
          <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
        </view>
      </block>
      
      <view v-if="villages.length === 0" class="empty-tip">
        <text>该营业部下暂无行政村数据</text>
      </view>
    </view>
  </view>
</template>

<script>
import branchData from '@/data/branches.js'

export default {
  data() {
    return {
      branchName: '加载中...', // 默认值
      villages: [] // 初始化为空数组
    }
  },
  onLoad(options) {
    // 安全解码参数
    try {
      this.branchName = options.branchName ? decodeURIComponent(options.branchName) : '未知营业部'
      
      // 安全获取行政村数据
      this.villages = (branchData && branchData[this.branchName]) || []
      
      console.log('当前数据:', {
        branchName: this.branchName,
        villages: this.villages,
        branchDataKeys: Object.keys(branchData || {})
      })
      
    } catch (e) {
      console.error('页面加载错误:', e)
      this.branchName = '数据加载失败'
      uni.showToast({
        title: '加载数据失败',
        icon: 'none'
      })
    }
  },
  methods: {
    changeBranch() {
      // 安全返回逻辑
      if (getCurrentPages().length > 1) {
        uni.navigateBack()
      } else {
        uni.redirectTo({ url: '/pages/index/index' })
      }
    },
    selectVillage(village) {
      uni.navigateTo({
        url: `/pages/upload/upload?branchName=${encodeURIComponent(this.branchName)}&villageName=${encodeURIComponent(village)}`
      })
    }
  }
}
</script>

<style>
/* 原有样式保持不变 */
.empty-tip {
  text-align: center;
  padding: 40rpx;
  color: #999;
}
.container {
  padding: 20rpx;
}
/* 新增样式 */
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.change-branch {
  margin: 0;
  padding: 0 15rpx;
  height: 50rpx;
  line-height: 50rpx;
  font-size: 24rpx;
  background-color: #f5f5f5;
  color: #666;
}
.header {
  padding: 30rpx 0;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
}

.village-list {
  margin-top: 20rpx;
}

.village-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
  font-size: 32rpx;
}
</style>