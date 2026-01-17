import { useUsers, useInstanceState, Interactable } from '@xrift/world-components'
import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState } from 'react'
import { type Group } from 'three'
import { RigidBody } from '@react-three/rapier'

interface PlayerMovement {
  position: { x: number; y: number; z: number }
  rotation: { yaw: number; pitch: number }
}

interface Tag {
  id: string
  label: string
  color: string
  column: number
}

interface TagBoardProps {
  tags: Tag[]
  title?: string
  columns?: number
  storageKey?: string
  position?: [number, number, number]
  rotation?: [number, number, number]
}

interface TagDisplayProps {
  userId: string
  getMovement: (userId: string) => PlayerMovement | undefined
  tags: Tag[]
  visible: boolean
}

const STORAGE_KEY_PREFIX = 'xrift-tag-'
const VISIBILITY_STORAGE_KEY = 'xrift-tag-visibility'

interface TagDisplayProps {
  userId: string
  getMovement: (userId: string) => PlayerMovement | undefined
  tags: Tag[]
  visible: boolean
  storageKey: string
}

const TagDisplay = ({ userId, getMovement, tags, visible, storageKey }: TagDisplayProps) => {
  const groupRef = useRef<Group>(null)
  const [selectedTagIds] = useInstanceState<string[]>(
    `tag-${storageKey}-${userId}`,
    []
  )

  useFrame(() => {
    if (!userId) return
    const movement = getMovement(userId)
    if (!movement || !groupRef.current) return

    groupRef.current.position.set(
      movement.position.x,
      movement.position.y + 1.8,
      movement.position.z
    )
  })

  // ユニークなタグIDのみを取得
  const uniqueTagIds = [...new Set(selectedTagIds)]
  const selectedTags = uniqueTagIds
    .map(id => tags.find(tag => tag.id === id))
    .filter((tag): tag is Tag => tag !== undefined)

  if (selectedTags.length === 0 || !visible) return null

  // タグを列ごとにグループ化
  const columnMap = new Map<number, Tag[]>()
  selectedTags.forEach(tag => {
    if (!columnMap.has(tag.column)) {
      columnMap.set(tag.column, [])
    }
    columnMap.get(tag.column)!.push(tag)
  })

  // 選択されている列のみを取得してソート
  const activeColumns = Array.from(columnMap.entries()).sort((a, b) => a[0] - b[0])

  const tagHeight = 0.16 // 0.2 * 0.8
  const tagWidth = 0.8 // 1.0 * 0.8
  const tagSpacing = 0 // パディング削除
  const columnSpacing = tagWidth // 列間も詰める

  // 最大行数を取得
  const maxRows = Math.max(...activeColumns.map(([, tags]) => tags.length))

  // 全体の幅を計算
  const totalWidth = activeColumns.length * tagWidth

  return (
    <group ref={groupRef}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <group>
          {/* 背景ボード */}
          <mesh position={[0, -(maxRows - 1) * (tagHeight + tagSpacing) / 2, -0.02]}>
            <planeGeometry args={[totalWidth + 0.1, maxRows * tagHeight + (maxRows - 1) * tagSpacing + 0.1]} />
            <meshBasicMaterial color={0x000000} opacity={0.5} transparent />
          </mesh>

          {activeColumns.map(([columnIndex, columnTags], activeColIndex) => {
            // 詰めた位置を計算（アクティブな列の数に基づく）
            const xPos = (activeColIndex - (activeColumns.length - 1) / 2) * columnSpacing

            return (
              <group key={columnIndex} position={[xPos, 0, 0]}>
                {columnTags.map((tag, rowIndex) => {
                  const yOffset = -rowIndex * (tagHeight + tagSpacing)
                  
                  return (
                    <group key={tag.id} position={[0, yOffset, 0]}>
                      {/* タグボックス */}
                      <mesh position={[0, 0, -0.01]}>
                        <planeGeometry args={[tagWidth, tagHeight]} />
                        <meshBasicMaterial color={tag.color} opacity={0.9} transparent />
                      </mesh>
                      {/* タグテキスト */}
                      <Text
                        position={[0, 0, 0]}
                        fontSize={0.08}
                        color={0xffffff}
                        anchorX="center"
                        anchorY="middle"
                      >
                        {tag.label}
                      </Text>
                    </group>
                  )
                })}
              </group>
            )
          })}
        </group>
      </Billboard>
    </group>
  )
}

interface TagSelectorProps {
  tags: Tag[]
  title: string
  columns: number
  storageKey: string
  position: [number, number, number]
  rotation: [number, number, number]
}

const TagSelector = ({ tags, title, columns, storageKey, position, rotation }: TagSelectorProps) => {
  const { localUser } = useUsers()
  // グローバル状態（他のユーザーから見える）
  const [, setGlobalSelectedTagIds] = useInstanceState<string[]>(
    `tag-${storageKey}-${localUser?.id}`,
    []
  )
  // ローカル状態（UI表示用）
  const [localSelectedTagIds, setLocalSelectedTagIds] = useState<string[]>([])
  const [tagsVisible, setTagsVisible] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // localStorageから初期値を読み込み（初回のみ）
  useEffect(() => {
    if (!localUser?.id || isInitialized) return
    
    const key = `${STORAGE_KEY_PREFIX}${storageKey}-${localUser.id}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const parsedTags = JSON.parse(saved)
        if (Array.isArray(parsedTags)) {
          setLocalSelectedTagIds(parsedTags)
          setGlobalSelectedTagIds(parsedTags)
        }
      } catch (e) {
        // パース失敗時は無視
      }
    }
    
    // 表示状態を読み込み
    const visibilityState = localStorage.getItem(VISIBILITY_STORAGE_KEY)
    if (visibilityState !== null) {
      setTagsVisible(visibilityState === 'true')
    }
    
    setIsInitialized(true)
  }, [localUser?.id, isInitialized, setGlobalSelectedTagIds])

  // ローカル選択状態が変わったらlocalStorageとグローバル状態に保存
  useEffect(() => {
    if (!localUser?.id || !isInitialized) return
    const key = `${STORAGE_KEY_PREFIX}${storageKey}-${localUser.id}`
    if (localSelectedTagIds.length > 0) {
      localStorage.setItem(key, JSON.stringify(localSelectedTagIds))
    } else {
      localStorage.removeItem(key)
    }
    // グローバル状態も更新
    setGlobalSelectedTagIds(localSelectedTagIds)
  }, [localSelectedTagIds, localUser?.id, isInitialized, setGlobalSelectedTagIds, storageKey])

  // 表示状態が変わったらlocalStorageに保存
  useEffect(() => {
    if (!isInitialized) return
    localStorage.setItem(VISIBILITY_STORAGE_KEY, tagsVisible.toString())
  }, [tagsVisible, isInitialized])

  const handleTagClick = (tagId: string) => {
    setLocalSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        // 既に選択されている場合は削除
        return prev.filter(id => id !== tagId)
      } else {
        // 未選択の場合は追加（ユニークにする）
        return [...new Set([...prev, tagId])]
      }
    })
  }

  const handleClear = () => {
    setLocalSelectedTagIds([])
    // localStorageからも削除
    if (localUser?.id) {
      const key = `${STORAGE_KEY_PREFIX}${storageKey}-${localUser.id}`
      localStorage.removeItem(key)
    }
  }

  const handleToggleVisibility = () => {
    setTagsVisible(prev => !prev)
  }

  // タグを列ごとにグループ化
  const columnGroups: Tag[][] = Array.from({ length: columns }, () => [])
  tags.forEach(tag => {
    const colIndex = Math.min(tag.column, columns - 1)
    columnGroups[colIndex].push(tag)
  })

  const tagHeight = 0.27 // 0.3 * 0.9
  const tagWidth = 1.33 // 2 * (2/3)
  const columnSpacing = tagWidth // 詰めて表示

  // ボード全体のサイズを計算
  const maxRowsInColumn = Math.max(...columnGroups.map(col => col.length), 0)
  const boardWidth = columns * tagWidth + 0.2
  const boardHeight = Math.max(maxRowsInColumn * tagHeight, 0) + 1.5 // タイトルとボタンエリアを含む

  return (
    <group position={position} rotation={rotation}>
      {/* 背景ボード */}
      <mesh position={[0, (0.8 - maxRowsInColumn * tagHeight / 2 + 1.5) / 2, -0.02]}>
        <planeGeometry args={[boardWidth, boardHeight]} />
        <meshBasicMaterial color={0x2a2a2a} opacity={0.9} transparent />
      </mesh>

      {/* タイトル */}
      <Text
        position={[0, 1.8, 0.01]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {title}
      </Text>

      {/* コントロールボタン */}
      <group position={[0, 1.6, 0]}>
        {/* クリアボタン */}
        <group position={[-0.9, -0.3, 0]}>
          <RigidBody type="fixed" colliders="cuboid">
            <Interactable
              id="tag-clear-button"
              onInteract={handleClear}
              interactionText="選択をクリア"
            >
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1.5, 0.35, 0.01]} />
                <meshStandardMaterial 
                  color={0xff6666}
                  opacity={0.9}
                  transparent
                />
              </mesh>
            </Interactable>
          </RigidBody>
          <Text
            position={[0, 0, 0.006]}
            fontSize={0.15}
            color={0xffffff}
            anchorX="center"
            anchorY="middle"
          >
            全削除
          </Text>
        </group>

        {/* 表示/非表示トグルボタン */}
        <group position={[0.9, -0.3, 0]}>
          <RigidBody type="fixed" colliders="cuboid">
            <Interactable
              id="tag-visibility-toggle"
              onInteract={handleToggleVisibility}
              interactionText={tagsVisible ? "タグを非表示" : "タグを表示"}
            >
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1.5, 0.35, 0.01]} />
                <meshStandardMaterial 
                  color={tagsVisible ? 0x00aa00 : 0xaa0000}
                  opacity={0.9}
                  transparent
                />
              </mesh>
            </Interactable>
          </RigidBody>
          <Text
            position={[0, 0, 0.006]}
            fontSize={0.15}
            color={0xffffff}
            anchorX="center"
            anchorY="middle"
          >
            {tagsVisible ? "非表示にする" : "表示する"}
          </Text>
        </group>
      </group>

      {/* タグボタン（列ごと） */}
      {columnGroups.map((columnTags, colIndex) => {
        const xPos = (colIndex - (columns - 1) / 2) * columnSpacing
        
        return (
          <group key={colIndex} position={[xPos, 0, 0.01]}>
            {columnTags.map((tag, rowIndex) => {
              const yPos = 0.8 - rowIndex * tagHeight // margin削除
              const isSelected = localSelectedTagIds.includes(tag.id)
              
              return (
                <group key={tag.id} position={[0, yPos, 0]}>
                  <RigidBody type="fixed" colliders="cuboid">
                    <Interactable
                      id={`tag-button-${tag.id}`}
                      onInteract={() => handleTagClick(tag.id)}
                      interactionText={tag.label}
                    >
                      <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[tagWidth, tagHeight, 0.01]} />
                        <meshStandardMaterial 
                          color={tag.color}
                          opacity={isSelected ? 1.0 : 0.5}
                          transparent
                        />
                      </mesh>
                    </Interactable>
                  </RigidBody>
                  <Text
                    position={[0, 0, 0.01]}
                    fontSize={0.15}
                    color={0xffffff}
                    anchorX="center"
                    anchorY="middle"
                  >
                    {tag.label}
                  </Text>
                  {/* 選択インジケーター */}
                  {isSelected && (
                    <Text
                      position={[-0.58, -0.02, 0.012]}
                      fontSize={0.2}
                      color={tag.color}
                      anchorX="center"
                      anchorY="middle"
                    >
                      ✓
                    </Text>
                  )}
                </group>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}

export const TagBoard = ({ tags, title = 'ステータスタグ選択', columns = 2, storageKey = 'default', position = [9.5, 2, 0], rotation = [0, -Math.PI / 2, 0] }: TagBoardProps) => {
  const { remoteUsers, getMovement, getLocalMovement, localUser } = useUsers()
  const [tagsVisible, setTagsVisible] = useState(true)

  // localStorageから表示状態を読み込み
  useEffect(() => {
    const visibilityState = localStorage.getItem(VISIBILITY_STORAGE_KEY)
    if (visibilityState !== null) {
      setTagsVisible(visibilityState === 'true')
    }
  }, [])

  // 表示状態の変更を監視（TagSelectorからの変更を反映）
  useEffect(() => {
    const handleStorageChange = () => {
      const visibilityState = localStorage.getItem(VISIBILITY_STORAGE_KEY)
      if (visibilityState !== null) {
        setTagsVisible(visibilityState === 'true')
      }
    }

    // localStorageの変更を監視
    const interval = setInterval(handleStorageChange, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* タグ選択ボード */}
      <TagSelector tags={tags} title={title} columns={columns} storageKey={storageKey} position={position} rotation={rotation} />

      {/* ローカルユーザーのタグ表示 */}
      {localUser && (
        <TagDisplay
          userId={localUser.id}
          getMovement={getLocalMovement}
          tags={tags}
          visible={tagsVisible}
          storageKey={storageKey}
        />
      )}
      {/* リモートユーザーのタグ表示 */}
      {remoteUsers.map((user) => (
        <TagDisplay
          key={user.id}
          userId={user.id}
          getMovement={getMovement}
          tags={tags}
          visible={tagsVisible}
          storageKey={storageKey}
        />
      ))}
    </>
  )
}

