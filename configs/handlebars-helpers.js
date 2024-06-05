module.exports = {
    // 주어진 리스트의 길이를 반환하는 헬퍼 함수
    lengthOfList: (list = []) => list.length,

    // 두 값이 동일한지 비교하는 헬퍼 함수
    eq: (val1, val2) => val1 === val2,

    // ISO 날짜 문자열을 읽기 쉬운 날짜 형식으로 변환하는 헬퍼 함수
    dateString: (isoString) => new Date(isoString).toLocaleDateString(),
    
    // 파일명에서 이미지 파일인지 확인하는 헬퍼 함수
    isImage: function (filename) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        const extension = filename.split('.').pop().toLowerCase();
        return imageExtensions.includes(extension);
    },
};