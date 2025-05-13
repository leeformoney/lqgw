<script>
export default {
  onLaunch() {
    // 检查缓存并跳转
    const lastBranch = uni.getStorageSync('lastSelectedBranch')
    if (lastBranch) {
      setTimeout(() => {
        // 检查目标页面是否存在数据
        if (this.checkBranchExists(lastBranch)) {
          uni.navigateTo({
            url: `/pages/villages/villages?branchName=${encodeURIComponent(lastBranch)}`
          })
        } else {
          uni.removeStorageSync('lastSelectedBranch') // 清除无效缓存
        }
      }, 300)
    }
  },
  methods: {
    checkBranchExists(branchName) {
      const branchData = require('@/data/branches.js')
      return !!branchData[branchName]
    }
  },

  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  }
}
</script>

<style>
/* 公共样式 */
page {
  background-color: #f8f8f8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

/* 解决H5端的问题 */
@media screen and (min-width: 768px) {
  .container {
    max-width: 500px;
    margin: 0 auto;
  }
}
</style>