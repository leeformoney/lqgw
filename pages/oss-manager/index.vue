<template>
  <view class="oss-manager">
    <!-- 统计卡片 -->
    <view class="stats-cards">
      <view class="stat-card">
        <text class="stat-value">{{ totalBranches }}</text>
        <text class="stat-label">营业部</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ totalVillages }}</text>
        <text class="stat-label">行政村</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ totalFiles }}</text>
        <text class="stat-label">照片</text>
      </view>
    </view>

    <!-- 目录结构 -->
    <view v-for="(branch, bIndex) in filteredData" :key="branch.branchName" class="branch-item">
      <view class="branch-header" @click="toggleBranch(bIndex)">
        <uni-icons :type="branch.expanded ? 'minus' : 'plus'" size="16" color="#666"></uni-icons>
        <text class="branch-name">{{ branch.branchName }}</text>
        <text class="branch-count">
          {{ branch.villages.length }}个村 / {{ branch.total }}张照片
        </text>
      </view>

      <view v-if="branch.expanded" class="village-list">
        <view 
          v-for="village in branch.villages" 
          :key="village.villageName" 
          class="village-item"
          @click="viewVillageFiles(branch.branchName, village.villageName)"
        >
          <view class="village-info">
            <text class="village-name">{{ village.villageName }}</text>
            <text class="village-count">{{ village.count }}张照片</text>
          </view>
          <uni-icons type="arrowright" size="14" color="#999"></uni-icons>
        </view>
      </view>
    </view>

    <!-- 分页控制 -->
    <view class="pagination">
      <button 
        v-if="!isLastPage && !loading" 
        @click="loadNextPage"
        :disabled="loading"
        class="load-more-btn"
      >
        加载更多
      </button>
      <view v-if="loading" class="loading-tip">
        <uni-icons type="spinner-cycle" size="16" color="#1890ff"></uni-icons>
        <text>加载中...</text>
      </view>
      <text v-if="isLastPage && !loading" class="no-more-tip">已加载全部数据</text>
    </view>
  </view>
</template>

<script>
import { listObjectsV2 } from '@/js_sdk/jason-alioss-upload/oss.js'

export default {
  data() {
    return {
      currentToken: '',
      isLastPage: false,
      loading: false,
      ossData: [],
      filteredData: [],
      totalFiles: 0,
      totalBranches: 0,
      totalVillages: 0
    }
  },
  onLoad() {
    this.loadNextPage()
  },
  onPullDownRefresh() {
    this.refreshData()
  },
  methods: {
    async loadNextPage() {
      if (this.loading || this.isLastPage) return
      
      this.loading = true
      try {
        const { data, nextToken } = await listObjectsV2({
          prefix: '目录文件营业部/',
          delimiter: '/',
          continuationToken: this.currentToken
        })

        this.processNewData(data.objects, data.commonPrefixes, !this.currentToken)
        this.currentToken = nextToken
        this.isLastPage = !nextToken
        
      } catch (error) {
        console.error('加载失败:', error)
        uni.showToast({ 
          title: '加载失败: ' + error.message,
          icon: 'none',
          duration: 3000
        })
      } finally {
        this.loading = false
        uni.stopPullDownRefresh()
      }
    },

    processNewData(objects, commonPrefixes, isRefresh) {
      if (isRefresh) {
        this.ossData = []
        this.totalFiles = 0
        this.totalBranches = 0
        this.totalVillages = 0
      }

      const branchMap = this.ossData.reduce((map, branch) => {
        map[branch.branchName] = {
          ...branch,
          villages: branch.villages.reduce((vMap, village) => {
            vMap[village.villageName] = village.count
            return vMap
          }, {})
        }
        return map
      }, {})

      commonPrefixes.forEach(prefix => {
        const [branch, village] = prefix.prefix.split('/').filter(Boolean)
        if (!branch) return

        if (!branchMap[branch]) {
          branchMap[branch] = {
            branchName: branch,
            villages: {},
            total: 0,
            expanded: false
          }
        }

        if (village && !branchMap[branch].villages[village]) {
          branchMap[branch].villages[village] = 0
        }
      })

      objects.forEach(file => {
        const parts = file.name.split('/').filter(Boolean)
        if (parts.length < 2) return

        const [branch, village] = parts
        if (!branchMap[branch]) {
          branchMap[branch] = {
            branchName: branch,
            villages: {},
            total: 0,
            expanded: false
          }
        }

        branchMap[branch].total++
        if (village) {
          if (!branchMap[branch].villages[village]) {
            branchMap[branch].villages[village] = 0
          }
          branchMap[branch].villages[village]++
        }
      })

      this.ossData = Object.values(branchMap).map(branch => ({
        ...branch,
        villages: Object.entries(branch.villages).map(([name, count]) => ({
          villageName: name,
          count
        }))
      }))

      this.updateStatistics()
      this.filteredData = [...this.ossData]
    },

    updateStatistics() {
      this.totalBranches = this.ossData.length
      this.totalVillages = this.ossData.reduce((sum, b) => sum + b.villages.length, 0)
      this.totalFiles = this.ossData.reduce((sum, b) => sum + b.total, 0)
    },

    toggleBranch(index) {
      this.$set(this.filteredData[index], 'expanded', !this.filteredData[index].expanded)
    },

    viewVillageFiles(branchName, villageName) {
      uni.navigateTo({
        url: `/pages/oss-manager/files?branch=${encodeURIComponent(branchName)}&village=${encodeURIComponent(villageName)}`
      })
    },

    refreshData() {
      this.currentToken = ''
      this.isLastPage = false
      this.loadNextPage()
    }
  }
}
</script>

<style>
.oss-manager {
  padding: 20rpx;
  padding-bottom: 120rpx;
}

.stats-cards {
  display: flex;
  margin: 20rpx 0;
}

.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin: 0 10rpx;
  text-align: center;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.05);
}

.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #1890ff;
  line-height: 1.4;
}

.stat-label {
  font-size: 24rpx;
  color: #666;
}

.branch-item {
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.05);
}

.branch-header {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
}

.branch-name {
  flex: 1;
  margin-left: 15rpx;
  font-size: 28rpx;
  color: #333;
}

.branch-count {
  font-size: 24rpx;
  color: #1890ff;
}

.village-list {
  background: #f9f9f9;
}

.village-item {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #eee;
}

.village-info {
  flex: 1;
}

.village-name {
  font-size: 26rpx;
  color: #666;
}

.village-count {
  font-size: 22rpx;
  color: #999;
  margin-top: 5rpx;
}

.pagination {
  margin: 30rpx 0;
  text-align: center;
}

.load-more-btn {
  background: #f5f5f5;
  color: #333;
  border: none;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
}

.loading-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20rpx;
  color: #1890ff;
}

.no-more-tip {
  font-size: 24rpx;
  color: #999;
}
</style>