/*
Template Name: Skote - Admin & Dashboard Template
Author: Themesbrand
Website: https://themesbrand.com/
Contact: themesbrand@gmail.com
File: Datatables Js File
*/

$(document).ready(function () {
    $('#datatable').DataTable();

    //Buttons examples
    var table = $('#datatable-buttons').DataTable({
        lengthChange: true,
        buttons: ['copy', 'excel', 'pdf', 'colvis']
    });

    table.buttons().container()
        .appendTo('#datatable-buttons_wrapper .col-md-6:eq(0)');

    $(".dataTables_length select").addClass('form-select form-select-sm');

    var table2 = $('#datatable-buttons2').DataTable({
        lengthChange: true,
        buttons: ['copy', 'excel', 'pdf', 'colvis']
    });

    table2.buttons().container()
        .appendTo('#datatable-buttons2_wrapper .col-md-6:eq(0)');

    $(".dataTables_length select").addClass('form-select form-select-sm');
    var table3 = $('#datatable-buttons3').DataTable({
        lengthChange: true,
        buttons: ['copy', 'excel', 'pdf', 'colvis']
    });

    table3.buttons().container()
        .appendTo('#datatable-buttons3_wrapper .col-md-6:eq(0)');

    $(".dataTables_length select").addClass('form-select form-select-sm');
});