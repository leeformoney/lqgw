<template>
  <view class="container">
    <view class="header">
      <text class="title">请选择您所在的营业部</text>
    </view>
    <view class="town-list">
      <block v-for="(branch, index) in branches" :key="index">
        <view class="town-item" @click="selectBranch(branch)">
          <text>{{ branch.name }}</text>
          <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
        </view>
      </block>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      // 从Excel中提取的所有唯一营业部
      branches: [
        { id: 1, name: '韦寨农村营业部' },
        { id: 2, name: '迎仙农村营业部' },
        { id: 3, name: '姜寨农村营业部' },
        { id: 4, name: '瓦店农村营业部' },
        { id: 5, name: '白庙农村营业部' },
        { id: 6, name: '桐城农村营业部' },
        { id: 7, name: '吕寨农村营业部' },
        { id: 8, name: '老集农村营业部' },
        { id: 9, name: '长官农村营业部' },
        { id: 10, name: '宋集农村营业部' },
        { id: 11, name: '张集农村营业部' },
        { id: 12, name: '艾亭农村营业部' },
				{ id: 13, name: '滑集农村营业部' },
				{ id: 14, name: '谭棚农村营业部' },
				{ id: 15, name: '杨桥农村营业部' },
        { id: 16, name: '城北城市营业部' },
        { id: 17, name: '城西城市营业部' }
      ]
    }
  },
  methods: {
    selectBranch(branch) {
      // 确保branch是字符串
      const branchName = typeof branch === 'string' ? branch : branch.name
      uni.navigateTo({
        url: `/pages/villages/villages?branchName=${encodeURIComponent(branchName)}`
      })
    }
  }
}
</script>

<style>
/* 保持原有样式不变 */
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

.town-list {
  margin-top: 20rpx;
}

.town-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
  font-size: 32rpx;
}
</style>