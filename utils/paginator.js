const lodash = require("lodash");
const PAGE_LIST_SIZE = 10; // 페이지 목록 크기

/* ========================
   페이징 처리를 위한 함수
========================= */
module.exports = ({ totalCount, page, perPage  = 10}) => {
    const PER_PAGE = perPage; // 페이지당 항목 수
    const totalPage = Math.ceil(totalCount / PER_PAGE);

    // 현재 페이지가 속한 페이지 목록의 시작 페이지 계산
    let quotient = parseInt(page / PAGE_LIST_SIZE);
    if(page % PAGE_LIST_SIZE === 0) {
        quotient -= 1;
    }
    const startPage = quotient * PAGE_LIST_SIZE + 1;

    // 현재 페이지가 속한 페이지 목록의 마지막 페이지 계산
    const endPage = startPage + PAGE_LIST_SIZE - 1 < totalPage 
        ? startPage + PAGE_LIST_SIZE - 1 
        : totalPage;
    const isFirstPage = page === 1; // 첫 페이지 여부 확인
    const isLastPage = page === totalPage; // 마지막 페이지 여부 확인
    const hasPrev = page > 1; // 이전 페이지 존재 여부 확인
    const hasNext = page < totalPage; // 다음 페이지 존재 여부 확인

    // 페이징 정보 객체 생성
    const paginator = {
        pageList: lodash.range(startPage, endPage + 1),
        page,
        prevPage: page - 1, // 이전 페이지
        nextPage: page + 1, // 다음 페이지
        startPage,
        lastPage: totalPage, // 마지막 페이지
        hasPrev,
        hasNext,
        isFirstPage,
        isLastPage
    };
    return paginator;
};