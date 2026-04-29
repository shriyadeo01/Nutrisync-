import { ActivityIndicator, Modal, Text, View } from 'react-native'


export default function LoadingDialog({ loading = false, message = 'Loading...' }) {
  return (
    <Modal transparent visible={loading}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            padding: 20,
            borderRadius: 15,
            backgroundColor: '#808080',
            alignItems: 'center',
            minWidth: 170,
          }}
        >
          <ActivityIndicator size="large" color={'#ffff'} />
          <Text
            style={{
              color: '#FFFF',
              fontSize: 16,
              marginTop: 10,
              fontWeight: '600',
            }}
          >
            {message}
          </Text>
        </View>
      </View>
    </Modal>
  )
}