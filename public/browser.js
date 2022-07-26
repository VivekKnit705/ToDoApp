const config = {
    headers: {
        'content-type': 'application/json'
    }
}


let skip = 0;
document.addEventListener('click', function (event) {
    if (event.target.classList.contains('add_item')) {
        event.preventDefault();
        const todoText = document.getElementById('create_field');
        if (todoText.value == "") {
            alert("Please enter Todo");
            return;
        }
        axios.post('/create-todo', JSON.stringify({
            todo: todoText.value
        }), config).then(res => {
            if (res.data.status !== 200) {
                alert(res.data.message);
                return;
            }
            todoText.value = "";
            // console.log(res.data.message);
        }).catch(err => {
            console.log(err);
        })

    }
    if (event.target.classList.contains('edit-me')) {
        const todoId = event.target.getAttribute('data-id');
        const todoText = prompt("Enter yur new todotext");
        axios.post('/edit-todo', JSON.stringify({
            todoId,
            todoText
        }), config).then(res => {
            console.log(res);
            if (res.data.status != 200) {
                alert(res.data.message);
                return;
            }
            event.target.parentElement.parentElement.querySelector('.item-text').innerHTML = todoText
        }).catch(err => {
            console.log(err);
        })
    }
    if (event.target.classList.contains('delete-me')) {
        const todoId = event.target.getAttribute('data-id');

        axios.post('/delete-todo', JSON.stringify({
            todoId
        }), config).then(res => {
            if (res.data.status != 200) {
                alert(res.data.message);
                return;
            }
            event.target.parentElement.parentElement.remove();
            skip--;
        }).catch(err => {
            console.log(err);
        })
    }
    if (event.target.getAttribute('id') == 'show-more') {
        generateTodo();
    }

})

window.onload = function () {
    // setInterval(generateTodo,3000);
    generateTodo();
}

function generateTodo() {
    axios.post(`/read-todo?skip=${skip}`, JSON.stringify({}), config).then(res => {
        if (res.status !== 200) {
            alert("Failed to read todo, Please try again!.");
            return;
        }
        console.log(res);
        const todoList = res.data.data;
        if (todoList.length === 0) {
            alert("No more Todo to Show");
            return;
        }
        document.getElementById('item_list').insertAdjacentHTML('beforeend', todoList.map(item => {
            return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
                <span class="item-text"> ${item.todo} </span>
                <div>
                <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
                <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
            </div>
        </li>`
        }).join(''))

        // Refrain from updating with a hard coded value
        // Reason: 1. Code will break incase limit changed in Backend 
        // 2. Todolist may not always be of fixed length (Reading last todos)
        
        skip += todoList.length;



        console.log(todoList);
    }).catch(err => {
        console.log(err);
        alert("Something went Wrong");
    })
}