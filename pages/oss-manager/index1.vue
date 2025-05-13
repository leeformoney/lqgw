<template>
	<view class="oss-manager">
		<!-- 顶部标题栏 -->
		<view class="header">
			<text class="title">OSS文件管理系统</text>

			<!-- 搜索框 -->
			<uni-search-bar placeholder="搜索营业部或行政村" v-model="searchText" @confirm="handleSearch" @clear="clearSearch"
				cancelButton="none">
			</uni-search-bar>

			<!-- 统计信息卡片组 -->
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
					<text class="stat-label">总文件数</text>
				</view>
			</view>
		</view>
		<scroll-view v-if="scrollViewHeight > 0 && !initializing" :style="{ height: scrollViewHeight + 'px' }">
			<!-- 内容 -->
		</scroll-view>
		<!-- 加载提示 -->
		<view class="loading-tip" v-if="loading">
			<uni-icons type="spinner-cycle" size="16" color="#1890ff"></uni-icons>
			正在加载数据 (已加载 {{ loadedFilesCount }} 个文件)...
		</view>

		<!-- 文件列表容器 -->
		<scroll-view scroll-y class="file-list" @scrolltolower="loadMore" :style="{ height: scrollViewHeight + 'px' }">

			<!-- 加载状态指示器 -->
			<uni-load-more :status="loading ? 'loading' : (noMore ? 'noMore' : 'more')" :contentText="{
          contentdown: '上拉加载更多',
          contentrefresh: '正在加载...',
          contentnomore: '已加载全部数据'
        }">
			</uni-load-more>

			<!-- 营业部列表 -->
			<block v-for="(branch, bIndex) in filteredData" :key="'branch-'+bIndex">
				<view class="branch-item">
					<!-- 营业部标题行 -->
					<view class="branch-header" @click="toggleExpand(bIndex)">
						<uni-icons :type="branch.expanded ? 'minus' : 'plus'" size="16" color="#666">
						</uni-icons>
						<text class="branch-name">{{ branch.branchName }}</text>
						<text class="branch-count">{{ branch.total }}个文件</text>
					</view>

					<!-- 行政村列表（展开状态） -->
					<view class="village-list" v-if="branch.expanded" :animation="slideAnimation">

						<view v-for="(village, vIndex) in branch.villages" :key="'village-'+vIndex" class="village-item"
							@click="handleVillageClick(branch.branchName, village.villageName)">

							<view class="village-info">
								<text class="village-name">{{ village.villageName }}</text>
								<text class="village-count">{{ village.count }}个文件</text>
							</view>

							<uni-icons type="arrowright" size="16" color="#999">
							</uni-icons>
						</view>
					</view>
				</view>
			</block>

			<!-- 空状态提示 -->
			<view v-if="!loading && filteredData.length === 0" class="empty-tip">
				<image src="/static/images/empty-state.png" mode="aspectFit"></image>
				<text class="empty-text">暂无数据</text>
				<text class="empty-subtext">当前条件下未找到匹配的营业部</text>
			</view>
		</scroll-view>

		<!-- 底部操作按钮 -->
		<view class="bottom-actions">
			<button class="action-btn" @click="handleRefresh" :disabled="loading">
				<uni-icons type="refresh" size="16"></uni-icons>
				{{ loading ? '刷新中...' : '刷新数据' }}
			</button>
		</view>
	</view>
</template>


<script>
	import {
		listObjectsV2
	} from '@/js_sdk/jason-alioss-upload/oss.js'

	export default {
		data() {
			return {
				// 核心数据
				branchList: [],
				filteredData: [],
				searchText: '',
				initializing: true,
				// 分页状态
				branchPage: {
					marker: '',
					hasMore: true,
					loading: false
				},
				villagePages: {}, // { branchName: { marker, hasMore, loading } }

				// 统计信息
				totalBranches: 0,
				totalVillages: 0,
				totalFiles: 0,

				// 缓存
				branchStats: {},
				expandedStates: {},

				// UI状态
				loading: false,
				noMore: false,
				scrollViewHeight: 500
			}
		},
		computed: {
			loadedFilesCount() {
				return this.branchList.reduce((sum, b) => sum + (b.fileCount || 0), 0)
			}
		},
		onLoad() {
			this.initLoad()
			// 3秒后打印状态 (调试用)
			setTimeout(() => this.verifyBucketStructure(), 3000)
			// 测试路径解析
			console.log('路径解析测试:', {
				'吕寨农村营业部/东周行政村/CGmeGwktCi.jpg': this.parseOssPath('吕寨农村营业部/东周行政村/CGmeGwktCi.jpg'),
				'test.txt': this.parseOssPath('test.txt')
			});
		},
		onReady() {
			// 确保页面完全加载后再计算高度
			setTimeout(() => {
				this.safeCalculateHeight()
			}, 300)
		},

		methods: {
			// 初始化加载
			async initLoad() {
				this.initializing = true
				try {
					uni.showLoading({
						title: '加载中...',
						mask: true
					})

					// 重置分页状态
					this.branchPage = {
						marker: '',
						hasMore: true,
						loading: false
					}

					// 清空旧数据
					this.branchList = []
					this.filteredData = []

					// 执行数据加载
					await this.loadBranches(true)

					// 更新过滤数据
					this.filteredData = [...this.branchList]

					// 如果数据为空显示提示
					if (this.branchList.length === 0) {
						uni.showToast({
							title: '未加载到营业部数据',
							icon: 'none'
						})
					}

				} catch (e) {
					console.error('初始化失败:', e)
					uni.showToast({
						title: '数据加载失败',
						icon: 'none'
					})
				} finally {
					uni.hideLoading()
					this.initializing = false
				}
			},
			// 新增方法：解析OSS路径
			parseOssPath(fullPath) {
				const parts = fullPath.split('/').filter(Boolean);
				return {
					branch: parts[0] || null,
					village: parts.length >= 2 ? parts[1] : null,
					filename: parts.length >= 3 ? parts.slice(2).join('/') : null
				}
			},
			updateStatistics() {
				this.totalBranches = this.ossData.length;
				this.totalVillages = this.ossData.reduce(
					(sum, b) => sum + (b.villages?.length || 0), 0);
				this.totalFiles = this.ossData.reduce(
					(sum, b) => sum + (b.total || 0), 0);
			},
			// 修改后的文件统计
			async getBranchFileCount(branchName) {
				const result = await this.safeOssRequest({
					prefix: `${branchName}/`,
					'max-keys': 0 // 只获取数量
				});
				return result.objects.length;
			},
			debugState() {
				console.log('=== 当前应用状态 ===')
				console.log('营业部列表:', JSON.parse(JSON.stringify(this.branchList)))
				console.log('过滤数据:', JSON.parse(JSON.stringify(this.filteredData)))
				console.log('分页状态:', JSON.parse(JSON.stringify(this.branchPage)))
				console.log('行政村分页:', JSON.parse(JSON.stringify(this.villagePages)))
				console.log('统计信息:', {
					营业部: this.totalBranches,
					行政村: this.totalVillages,
					文件数: this.totalFiles
				})
			},
			async loadMore() {
				if (this.branchList.some(b => b.expanded)) {
					const expandedBranch = this.branchList.find(b => b.expanded)
					if (expandedBranch) {
						await this.loadMoreVillages(expandedBranch.name)
					}
				} else {
					await this.loadMoreBranches()
				}
			},
			async safeCalculateHeight() {
				try {
					const systemInfo = uni.getSystemInfoSync()

					// 默认值
					let finalHeight = systemInfo.windowHeight - 200

					// 安全获取元素高度
					const getHeight = (selector) => {
						return new Promise(resolve => {
							const query = uni.createSelectorQuery().in(this)
							query.select(selector).boundingClientRect(res => {
								resolve(res ? res.height : 0)
							}).exec()
						})
					}

					const [headerHeight, footerHeight] = await Promise.all([
						getHeight('.header'),
						getHeight('.bottom-actions')
					])

					if (headerHeight > 0 && footerHeight > 0) {
						finalHeight = systemInfo.windowHeight - headerHeight - footerHeight - 20
					}

					this.scrollViewHeight = finalHeight
				} catch (e) {
					console.warn('计算高度失败:', e)
					const systemInfo = uni.getSystemInfoSync()
					this.scrollViewHeight = systemInfo.windowHeight - 200
				}
			},



			// 搜索处理
			handleSearch() {
				if (!this.searchText.trim()) {
					this.filteredData = [...this.branchList]
					this.filteredData.forEach(b => {
						b.expanded = this.expandedStates[b.name] || false
					})
					return
				}

				const query = this.searchText.toLowerCase()
				this.filteredData = this.branchList.filter(branch => {
					const matchBranch = branch.name.toLowerCase().includes(query)
					const matchVillages = branch.villages?.some(v =>
						v.name.toLowerCase().includes(query)
					)
					return matchBranch || matchVillages
				})

				// 自动展开匹配项
				this.filteredData.forEach(branch => {
					branch.expanded = true
					if (!branch.loaded) {
						this.loadVillages(branch.name)
					}
				})
			},

			// 清除搜索
			clearSearch() {
				this.searchText = ''
				this.handleSearch()
			},
			updateStatistics() {
				this.totalBranches = this.branchList.length;
				this.totalVillages = this.branchList.reduce(
					(sum, b) => sum + (b.villages?.length || 0), 0);
				this.totalFiles = this.branchList.reduce(
					(sum, b) => sum + (b.fileCount || 0), 0);
			},
			// 以下是您原有的方法（保持不变）
			async loadData(isRefresh = false) {
				if (this.loading) return;

				this.loading = true;
				try {
					// 使用新版API参数
					const result = await listObjectsV2({
						prefix: '',
						delimiter: '/', // 关键：启用目录模式
						'max-keys': 100,
						'continuation-token': isRefresh ? '' : this.nextMarker,
						'list-type': 2 // 必须使用V2版本
					});

					console.log('OSS响应数据:', result); // 调试日志

					// 处理营业部数据
					const newBranches = [];
					if (result.commonPrefixes && result.commonPrefixes.length > 0) {
						// 标准目录模式
						newBranches.push(...result.commonPrefixes.map(item => ({
							branchName: item.prefix.replace(/\/$/, ''), // 去除结尾斜杠
							total: 0,
							expanded: false,
							villages: []
						})));
					} else if (result.objects && result.objects.length > 0) {
						// 备用方案：从文件路径提取
						const branchMap = new Map();
						result.objects.forEach(obj => {
							const pathParts = obj.name.split('/').filter(Boolean);
							if (pathParts.length >= 2) { // 至少包含营业部和行政村
								const branchName = pathParts[0];
								const villageName = pathParts[1];

								if (!branchMap.has(branchName)) {
									branchMap.set(branchName, {
										branchName,
										total: 1,
										expanded: false,
										villages: [{
											villageName,
											count: 1
										}]
									});
								} else {
									const branch = branchMap.get(branchName);
									branch.total++;
									const village = branch.villages.find(v => v.villageName === villageName);
									if (village) {
										village.count++;
									} else {
										branch.villages.push({
											villageName,
											count: 1
										});
									}
								}
							}
						});
						newBranches.push(...branchMap.values());
					}

					// 更新数据
					if (isRefresh) {
						this.ossData = newBranches;
					} else {
						this.ossData = [...this.ossData, ...newBranches];
					}

					this.filteredData = [...this.ossData];
					this.nextMarker = result.nextContinuationToken || '';
					this.noMore = !result.isTruncated;

					// 更新统计
					this.updateStatistics();

				} catch (error) {
					console.error('加载失败:', error);
					uni.showToast({
						title: '加载失败: ' + (error.message || '未知错误'),
						icon: 'none'
					});
				} finally {
					this.loading = false;
				}
			},
			async verifyBucketStructure() {
				console.log('开始验证Bucket结构...')
				const testParams = [{
						prefix: '',
						delimiter: '/',
						desc: '根目录'
					},
					{
						prefix: '吕寨农村营业部/',
						delimiter: '/',
						desc: '营业部级别'
					}
				]

				for (const param of testParams) {
					const result = await this.safeOssRequest({
						...param,
						'max-keys': 5
					})
					console.log(`Bucket结构测试(${param.desc}):`, {
						params: param,
						commonPrefixes: result.commonPrefixes,
						objectKeys: result.contents.map(c => c.key)
					})
				}
			},
			async getBranchFileCount(branchName) {
				const result = await this.safeOssRequest({
					prefix: `${branchName}/`,
					'max-keys': 0, // 只需要数量不需要内容
					'list-type': 2
				});
				return result.keyCount || 0; // V2接口直接返回keyCount
			},

			async loadVillages(branchName) {
				const branch = this.branchList.find(b => b.name === branchName);
				if (!branch || branch.loadingVillages) return;

				branch.loadingVillages = true;
				try {
					const result = await this.safeOssRequest({
						prefix: `${branchName}/`,
						delimiter: '/',
						'max-keys': 100
					});

					// 更新行政村文件数统计
					branch.villages.forEach(village => {
						village.fileCount = result.objects.filter(obj =>
							obj.name.startsWith(`${branchName}/${village.name}/`)
						).length;
					});

					branch.loaded = true;
					this.updateStatistics(); // 刷新统计

				} catch (error) {
					console.error(`加载${branchName}行政村失败:`, error);
				} finally {
					branch.loadingVillages = false;
				}
			},

			async loadVillageStats(branchName, villages) {
				for (const village of villages) {
					const res = await listObjectsV2({
						prefix: `${branchName}/${village.name}/`,
						'max-keys': 1
					}).catch(() => ({
						objects: []
					}))

					village.fileCount = res.objects.length
					this.$forceUpdate()
				}
			},

			loadMoreVillages(branchName) {
				this.loadVillages(branchName)
			},

			loadMoreBranches() {
				this.loadBranches()
			},

			toggleBranch(branch, index) {
				const newExpanded = !branch.expanded
				this.$set(this.branchList, index, {
					...branch,
					expanded: newExpanded
				})
				this.expandedStates[branch.name] = newExpanded

				if (newExpanded && !branch.loaded) {
					this.loadVillages(branch.name)
				}
			},

			viewVillageFiles(branchName, villageName) {
				uni.navigateTo({
					url: `/pages/file-list/index?branch=${encodeURIComponent(branchName)}&village=${encodeURIComponent(villageName)}`
				})
			},

			async handleRefresh() {
				this.branchList = []
				this.filteredData = []
				this.branchPage = {
					marker: '',
					hasMore: true,
					loading: false
				}
				this.villagePages = {}
				this.branchStats = {}
				this.totalFiles = 0
				this.totalVillages = 0
				this.noMore = false
				await this.initLoad()
			},
			async safeOssRequest(params) {
				try {
					const result = await listObjectsV2({
						...params,
						'list-type': 2
					});

					// 标准化响应格式
					return {
						objects: result.objects || [],
						commonPrefixes: result.commonPrefixes || [],
						isTruncated: result.isTruncated,
						nextMarker: result.nextMarker || result.nextContinuationToken || ''
					};
				} catch (error) {
					console.error('OSS请求失败:', error);
					return {
						objects: [],
						commonPrefixes: [],
						isTruncated: false,
						nextMarker: ''
					};
				}
			},
			getEmptyOSSResponse() {
				return {
					contents: [],
					commonPrefixes: [],
					isTruncated: false,
					nextContinuationToken: '',
					keyCount: 0
				};
			}
		}
	}
</script>

<style>
	.oss-manager {
		padding: 20px;
		padding-bottom: 80px;
		min-height: 100vh;
		background-color: #f8f8f8;
	}

	.header {
		margin-bottom: 20px;
	}

	.file-list {
		/* 替换原来的固定高度 */
		height: calc(100vh - 260px);
		/* 或者使用动态绑定的高度 */
		/* height: v-bind(scrollViewHeight + 'px'); */
	}

	.loading-tip {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 10px;
		font-size: 14px;
		color: #666;
	}

	.loading-tip .uni-icons {
		margin-right: 5px;
		animation: rotating 1s linear infinite;
	}

	@keyframes rotating {
		from {
			transform: rotate(0deg);
		}

		to {
			transform: rotate(360deg);
		}
	}

	.title {
		display: block;
		font-size: 20px;
		font-weight: bold;
		margin-bottom: 15px;
		color: #333;
	}

	.stats-cards {
		display: flex;
		justify-content: space-between;
		margin-bottom: 20px;
	}

	.stat-card {
		flex: 1;
		background-color: #fff;
		border-radius: 8px;
		padding: 15px;
		margin: 0 5px;
		text-align: center;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
	}

	.stat-value {
		display: block;
		font-size: 24px;
		font-weight: bold;
		color: #1890ff;
		margin-bottom: 5px;
	}

	.stat-label {
		font-size: 12px;
		color: #666;
	}

	.file-list {
		height: calc(100vh - 260px);
	}

	.branch-item {
		background-color: #fff;
		border-radius: 8px;
		margin-bottom: 10px;
		overflow: hidden;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
	}

	.branch-header {
		display: flex;
		align-items: center;
		padding: 12px 15px;
		border-bottom: 1px solid #f0f0f0;
	}

	.branch-name {
		flex: 1;
		margin-left: 8px;
		font-size: 16px;
		color: #333;
	}

	.branch-count {
		font-size: 14px;
		color: #1890ff;
	}

	.village-list {
		background-color: #f9f9f9;
	}

	.village-item {
		display: flex;
		align-items: center;
		padding: 12px 15px;
		border-bottom: 1px solid #eee;
	}

	.village-item:last-child {
		border-bottom: none;
	}

	.village-info {
		flex: 1;
	}

	.village-name {
		display: block;
		font-size: 14px;
		color: #666;
	}

	.village-count {
		font-size: 12px;
		color: #999;
		margin-top: 2px;
	}

	.loading-tip {
		padding: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #666;
		font-size: 12px;
	}

	.load-more {
		padding: 12px;
		text-align: center;
		color: #1890ff;
		font-size: 14px;
		background: #f5f5f5;
	}

	.empty-tip {
		padding: 40px 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.empty-tip image {
		width: 120px;
		height: 120px;
		opacity: 0.6;
		margin-bottom: 15px;
	}

	.empty-sub {
		font-size: 12px;
		color: #999;
		margin-top: 5px;
	}

	.bottom-actions {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 10px 20px;
		background-color: #fff;
		border-top: 1px solid #eee;
		display: flex;
		justify-content: center;
	}

	.action-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #f5f5f5;
		color: #333;
	}

	.action-btn .uni-icons {
		margin-right: 5px;
	}
</style>